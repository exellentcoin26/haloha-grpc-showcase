"use client";

import { useState } from "react";

import { register, RegisterError } from "@/lib/authentication";

interface FieldErrors {
    username?: string;
    password?: string;
}

function handleRegisterError(error: RegisterError): FieldErrors {
    if (error.kind === "form") {
        const formError = error.error;
        // form validation error
        return {
            ...(formError.username && { username: formError.username[0] }),
            ...(formError.passwordHash && {
                password: formError.passwordHash[0],
            }),
        };
    } else {
        // grpc register call error
        return {
            username: "username already taken",
        };
    }
}

export default function Home() {
    // Keep track of errors.
    // NOTE: This is not the best way, but is just and example.
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    // Login the user and set an appropriate message if succesful.
    const handleSubmit = async (formData: FormData) => {
        if (Object.keys(fieldErrors).length !== 0) {
            // reset errors
            setFieldErrors({});
        }

        const result = await register(formData);
        if (result.ok) {
            // do something here with the token.
            alert("successfully registered user");
        } else {
            // Do something with the errors under result.val. Typescript knows
            // that the result.val is now the error type because ok is false.
            setFieldErrors(handleRegisterError(result.val));
        }
    };

    return (
        // Styling generated by ChatGPT (not my work :))
        <main className="max-w-sm mx-auto mt-10 p-6 bg-white rounded shadow-md">
            <form action={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="username" className="block font-bold">
                        Username
                    </label>
                    <input
                        type="text"
                        placeholder="Enter Username"
                        name="username"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        required
                    />
                    {fieldErrors.username && <b>{fieldErrors.username}</b>}
                </div>

                <div>
                    <label htmlFor="password" className="block font-bold">
                        Password
                    </label>
                    <input
                        type="password"
                        placeholder="Enter Password"
                        name="password"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        required
                    />
                    {fieldErrors.password && <b>{fieldErrors.password}</b>}
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600"
                >
                    Register
                </button>
            </form>
        </main>
    );
}
