import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Analytics } from "@vercel/analytics/react";
import { useOnlineTracker } from "./hooks/useOnlineTracker";

function App() {
    useOnlineTracker();

    return (
        <BrowserRouter>
            <AppRoutes />
            <Analytics />
            <ToastContainer position="top-right" autoClose={3000} />
        </BrowserRouter>
    );
}
export default App;
