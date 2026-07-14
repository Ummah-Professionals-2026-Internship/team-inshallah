import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import EmailVerification from "./components/EmailVerification";
import StudentForm from './StudentForm';
import ProfessionalForm from './ProfessionalForm';
import StudentDashboard from './components/StudentDashboard';
import ProfessionalDashboard from './components/ProfessionalDashboard';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/verify-email" element={<EmailVerification />} />
                <Route path="/student-form" element={<StudentForm />} />
                <Route path="/professional-form" element={<ProfessionalForm />} />
                <Route path="/student-dashboard" element={<StudentDashboard />} />
                <Route path="/professional-dashboard" element={<ProfessionalDashboard />} />

            </Routes>
        </BrowserRouter>
    );
}
