use anyhow::{Context, Result};
use proto::{
    authentication_service_server::{AuthenticationService, AuthenticationServiceServer},
    login_response, LoginError, LoginRequest, LoginResponse, RegisterError, RegisterRequest,
    RegisterResponse, User,
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
    ) -> Result<Response<RegisterResponse>, Status> {
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
            return Ok(Response::new(RegisterResponse {
                error: Some(RegisterError::UsernameTaken.into()),
            }));
        };

        // set the users password
        entry.insert(password_hash);

        Ok(Response::new(RegisterResponse { error: None }))
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
        Ok(database
            .get(&username)
            .filter(|p| **p == password_hash)
            .map(|_| {
                Response::new(LoginResponse {
                    result: Some(login_response::Result::Token(
                        "some-nice-token-that-should-eventually-be-a-json-webtoken".to_string(),
                    )),
                })
            })
            .unwrap_or_else(|| {
                Response::new(LoginResponse {
                    result: Some(login_response::Result::Error(
                        LoginError::InvalidCredentials.into(),
                    )),
                })
            }))
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .init();

    let database = Arc::new(DataBase::new(HashMap::new()));

    let authenticator_service = AuthenticationServiceServer::new(Authenticator {
        db: database.clone(),
    });
    let app = tonic::transport::Server::builder()
        .accept_http1(true)
        .trace_fn(|_| tracing::info_span!("request"))
        .add_service(tonic_web::enable(authenticator_service));

    let socket_addr = SocketAddr::from(([127, 0, 0, 1], PORT));
    tracing::info!("Application should now be running at `{}`", socket_addr);
    if let Err(err) = app.serve(socket_addr).await {
        eprintln!("{}", err)
    };

    Ok(())
}
