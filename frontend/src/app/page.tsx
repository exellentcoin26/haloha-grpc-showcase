"use client"

import { useState } from "react";
import { setCookie } from "cookies-next";

import { login } from "@/lib/authentication";

export default function Home() {
    // Keep track of errors.
    // NOTE: This is not the best way, but is just and example. Errors should
    // be displayed with the field and not at the bottom.
    // const [errors, setErrors] = useState([]);
    const [loggedIn, SetLoggedIn] = useState(false);

    // Login the user and set an appropriate message if succesful.
    const handleSubmit = async (data: FormData) => {
        const result = await login(data);
        console.log(result);
        if (result.ok) {
            // do something here with the token.
            setCookie("jwt", result.val);
            SetLoggedIn(true);
            alert("logged in");
        } else {
            // Do something with the errors under result.val. Typescript knows
            // that the result.val is now the error type because ok is false.
            console.error(result.val);
        }
    };

    return (
        <main>
            <form action={handleSubmit}>
                <label htmlFor="username"><b>Username</b></label>
                <input type="text" placeholder="Enter Username" name="username" required />

                <label htmlFor="password"><b>Password</b></label>
                <input type="password" placeholder="Enter Password" name="password" required />

                <button type="submit">Login</button>
            </form>
        </main>
    );
}
