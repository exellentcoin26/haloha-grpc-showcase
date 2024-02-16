fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .build_client(false)
        .compile(&["../proto/users/authentication.proto"], &["../proto"])
        .map_err(std::io::Error::into)
}
