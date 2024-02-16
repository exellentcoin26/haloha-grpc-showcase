import { createChannel, createClient, ClientError, Status } from "nice-grpc-web";
// Handy rust like result type to avoid throwing errors when the error is
// expected or accounted for. Exceptions should only happen in exceptional,
// unusual, unexpected cases and should not be caught.
import { Result, Err, Ok } from "ts-results";
import { z } from "zod";

import { AuthenticationServiceDefinition, AuthenticationServiceClient, LoginResponse } from "@/proto/users/authentication";
import { redirect } from "next/navigation";

// Validate login and register form data with the same schema as they use the
// same data. Define more schemas if necessary.
const schema = z.object({
    username: z.string({
        required_error: "username is required"
    }),
    // if the password is null, use a default of the empty string
    passwordHash: z.string().default(""),
});
// Errors that can be returned by zod schema validation.
type FieldErrors = {
    username?: string[],
    passwordHash?: string[],
}
// Erros that can happen because the user used the wrong credentials, username
// does not exist, etc.
enum UserError {
    InvalidCredentials,
}

export async function login(formData: FormData): Promise<Result<string, FieldErrors | UserError>> {
    console.log(formData);
    console.log(formData.get("username"));

    // Create and validate the user data input schema from form data.
    const user = schema.safeParse({
        username: formData.get("username"),
        passwordHash: formData.get("password")
    });

    // Return errors belonging to schema validation if any.
    if (!user.success) {
        return Err(user.error.flatten().fieldErrors);
    }

    // Connect to the grpc server running in rust.
    const channel = createChannel("http://127.0.0.1:8080");
    const client: AuthenticationServiceClient = createClient(AuthenticationServiceDefinition, channel);

    const loginResponse = await (async (): Promise<Result<LoginResponse, UserError>> => {
        try {
            // Return the loginResponse generated from the proto files if no
            // errors occurred.
            return Ok(await client.loginUser({ user: { ...user.data } }));
        } catch (e) {
            if (
                e instanceof ClientError
                && e.code === Status.INVALID_ARGUMENT
                && e.message.includes("username/password combination")
            ) {
                // Return the appropriate error to the frontend so that this
                // can be displayed to the user.
                return Err(UserError.InvalidCredentials)
            } else {
                // Throw errors that are unexpected.
                throw e;
            }
        }
    })();

    // Return expected errors if they were returned above, else map the
    // loginResponse type to the token field on the type.
    return loginResponse.map((r) => r.token);
}
