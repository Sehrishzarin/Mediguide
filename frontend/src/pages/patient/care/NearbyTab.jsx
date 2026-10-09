import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HospitalMap from '../../../components/HospitalMap';

// Care › Nearby: the facility map. "Book" opens Book a doctor filtered to that facility.
export default function NearbyTab() {
  const navigate = useNavigate();
  const handleBook = useCallback((org) => {
    navigate('/patient/care/book', { state: { orgName: org.name } });
  }, [navigate]);

  return <HospitalMap onSelectBooking={handleBook} />;
}
