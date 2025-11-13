import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Jobs from './pages/Jobs';
import Applications from './pages/Applications';
import Profile from './pages/Profile';
import JobDetails from './pages/JobDetails';
import Pricing from './pages/Pricing';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './Layout.jsx';


export const PAGES = {
    "dashboard": Dashboard,
    "onboarding": Onboarding,
    "jobs": Jobs,
    "applications": Applications,
    "analytics": Analytics,
    "profile": Profile,
    "jobdetails": JobDetails,
    "pricing": Pricing,
}

export const pagesConfig = {
    mainPage: "dashboard",
    Pages: PAGES,
    Layout: Layout,
};