"use server";

import {
    createChannel,
    createClient,
    ClientError,
    Status,
} from "nice-grpc-web";
// Handy rust like result type to avoid throwing errors when the error is
// expected or accounted for. Exceptions should only happen in exceptional,
// unusual, unexpected cases and should not be caught.
import { Result, Err, Ok } from "ts-results";
import { z } from "zod";

import {
    AuthenticationServiceDefinition,
    AuthenticationServiceClient,
    LoginError as GrpcLoginError,
    RegisterError as GrpcRegisterError,
} from "@/proto/users/authentication";

// Validate login and register form data with the same schema as they use the
// same data. Define more schemas if necessary.
const schema = z.object({
    username: z.string({
        required_error: "username is required",
    }),
    // if the password is null, use a default of the empty string
    passwordHash: z.string().default(""),
});

// Type alias for errors that can be returned by zod schema validation. It is
// stupid that this has to be defined, but zod does not define the error type
// that is returned when form validation fails.
export interface ZodFormValidationErrors {
    username?: string[];
    passwordHash?: string[];
}

// Define a discrimminant union type to return errors as.
// See https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
interface LoginErrorForm {
    kind: "form";
    error: ZodFormValidationErrors;
}
interface LoginErrorGrpc {
    kind: "grpc";
    error: GrpcLoginError;
}
export type LoginError = LoginErrorForm | LoginErrorGrpc;

interface RegisterErrorForm {
    kind: "form";
    error: ZodFormValidationErrors;
}
interface RegisterErrorGrpc {
    kind: "grpc";
    error: GrpcRegisterError;
}
export type RegisterError = RegisterErrorForm | RegisterErrorGrpc;

export async function login(
    formData: FormData
): Promise<Result<string, LoginError>> {
    // Create and validate the user data input schema from form data.
    const user = schema.safeParse({
        username: formData.get("username"),
        passwordHash: formData.get("password"),
    });

    // Return errors belonging to schema validation if any.
    if (!user.success) {
        return Err({ kind: "form", error: user.error.flatten().fieldErrors });
    }

    // Connect to the grpc server running in rust.
    const channel = createChannel("http://127.0.0.1:8080");
    const client: AuthenticationServiceClient = createClient(
        AuthenticationServiceDefinition,
        channel
    );

    const loginResponse = await client.loginUser({ user: { ...user.data } });

    // Return expected errors if they were returned above, else map the
    // loginResponse type to the token field on the type.
    if (loginResponse.error !== undefined) {
        // Return the error to the caller
        return Err({ kind: "grpc", error: loginResponse.error });
    } else if (loginResponse.token) {
        // Return the json webtoken
        return Ok(loginResponse.token);
    } else {
        // Typescript is not able to infer that token exists if error does not.
        throw Error("unreachable");
    }
}

export async function register(
    formData: FormData
): Promise<Result<{}, RegisterError>> {
    // Create and validate the user data input schema from form data.
    const user = schema.safeParse({
        username: formData.get("username"),
        passwordHash: formData.get("password"),
    });

    // Return errors belonging to schema validation if any.
    if (!user.success) {
        return Err({ kind: "form", error: user.error.flatten().fieldErrors });
    }

    // Connect to the grpc server running in rust.
    const channel = createChannel("http://127.0.0.1:8080");
    const client: AuthenticationServiceClient = createClient(
        AuthenticationServiceDefinition,
        channel
    );

    const registerResponse = await client.registerUser({
        user: { ...user.data },
    });

    // Return expected errors if they were returned above, else map the
    // loginResponse type to the token field on the type.
    if (registerResponse.error !== undefined) {
        // Return the error to the caller
        return Err({ kind: "grpc", error: registerResponse.error });
    } else {
        return Ok({});
    }
}
