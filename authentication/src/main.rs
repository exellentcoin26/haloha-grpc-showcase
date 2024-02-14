use anyhow::{Context, Result};
use proto::{
    AuthenticationService, AuthenticationServiceServer, LoginRequest, LoginResponse,
    RegisterRequest, User,
};
use std::{collections::hash_map::HashMap, net::SocketAddr, sync::Arc};
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};

mod proto;

const PORT: u16 = 8080;

type DataBase = RwLock<HashMap<String, String>>;
type DataBaseEntry<'a> = std::collections::hash_map::Entry<'a, String, String>;

struct Authenticator {
    db: Arc<DataBase>,
}

#[tonic::async_trait]
impl AuthenticationService for Authenticator {
    async fn register_user(
        &self,
        request: Request<RegisterRequest>,
    ) -> Result<Response<()>, Status> {
        let RegisterRequest { user } = request.into_inner();
        let Some(User {
            username,
            password_hash,
        }) = user
        else {
            return Err(Status::new(
                tonic::Code::InvalidArgument,
                "user field is required",
            ));
        };

        let mut database = self.db.write().await;
        let DataBaseEntry::Vacant(entry) = database.entry(username) else {
            return Err(Status::new(
                tonic::Code::AlreadyExists,
                "username already exists",
            ));
        };

        // set the users password
        entry.insert(password_hash);

        Ok(Response::new(()))
    }

    async fn login_user(
        &self,
        request: Request<LoginRequest>,
    ) -> Result<Response<LoginResponse>, Status> {
        let LoginRequest { user } = request.into_inner();

        let Some(User {
            username,
            password_hash,
        }) = user
        else {
            return Err(Status::new(
                tonic::Code::InvalidArgument,
                "user field is required",
            ));
        };

        let database = self.db.read().await;
        database
            .get(&username)
            .filter(|p| **p == password_hash)
            .map(|_| {
                Response::new(LoginResponse {
                    token: "some-nice-token-that-should-eventually-be-a-json-webtoken".to_string(),
                })
            })
            .ok_or_else(|| {
                Status::new(
                    tonic::Code::InvalidArgument,
                    "username/password combination incorrect",
                )
            })
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let database = Arc::new(DataBase::new(HashMap::new()));

    let authenticator_service = AuthenticationServiceServer::new(Authenticator {
        db: database.clone(),
    });
    let app = tonic::transport::Server::builder().add_service(authenticator_service);

    if let Err(err) = app.serve(SocketAddr::from(([127, 0, 0, 1], PORT))).await {
        eprintln!("{}", err)
    };

    Ok(())
}
