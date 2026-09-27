import { Navigate, useLocation } from 'react-router-dom';
import SubmissionHistory from '../components/SubmissionHistory';

export default function SubmissionHistoryPage() {
  const location = useLocation();
  const token = localStorage.getItem('token');

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return (
    <SubmissionHistory
      accessToken={token}
      apiBaseUrl="http://localhost:5001/api"
    />
  );
}