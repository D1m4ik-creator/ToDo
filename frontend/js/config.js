const API_ORIGIN =
    window.localStorage.getItem("api_origin") ||
    `${window.location.protocol}//127.0.0.1:8000`;

const API_URL = `${API_ORIGIN}/api`;
const WS_URL = API_ORIGIN.replace("http://", "ws://").replace("https://", "wss://");
const GOOGLE_CLIENT_ID =
    window.localStorage.getItem("google_client_id") ||
    "219724419452-gvnuibp42kbe3ts4gs0vdt2nesql45rq.apps.googleusercontent.com";

function redirectToLogin() {
    const isProjectPage = window.location.pathname.endsWith("project.html");
    if (isProjectPage) {
        window.location.href = "index.html#login";
        return;
    }

    if (typeof showPage === "function") {
        showPage("login");
        return;
    }

    window.location.hash = "#login";
}
