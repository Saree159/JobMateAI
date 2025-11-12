import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Jobs from './pages/Jobs';
import Applications from './pages/Applications';
import Profile from './pages/Profile';
import JobDetails from './pages/JobDetails';
import Pricing from './pages/Pricing';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Onboarding": Onboarding,
    "Jobs": Jobs,
    "Applications": Applications,
    "Profile": Profile,
    "JobDetails": JobDetails,
    "Pricing": Pricing,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};