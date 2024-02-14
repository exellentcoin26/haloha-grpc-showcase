pub(crate) use authenication::{
    authentication_service_server::{AuthenticationService, AuthenticationServiceServer},
    LoginRequest, LoginResponse, RegisterRequest, User,
};

mod authenication {
    tonic::include_proto!("users");
}
