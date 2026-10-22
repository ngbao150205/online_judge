import { API_BASE_URL } from '../config/api';
import SubmissionHistory from '../components/SubmissionHistory';

export default function SubmissionHistoryPage() {
  return (
    <SubmissionHistory
      apiBaseUrl={API_BASE_URL}
    />
  );
}
