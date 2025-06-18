import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { AuthContext } from '../../context/AuthContext';

interface KYCData {
  date_of_birth: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  phone_number: string;
  national_insurance_number: string;
}

const ProfileForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [kycData, setKycData] = useState<KYCData>({
    date_of_birth: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'United Kingdom',
    phone_number: '',
    national_insurance_number: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKYCData = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('kyc_data')
          .select('*')
          .eq('profile_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) setKycData(data);
      } catch (err) {
        console.error('Error fetching KYC data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKYCData();
  }, [user]);

  const handleChange = (field: keyof KYCData, value: string) => {
    setKycData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('kyc_data')
        .upsert({
          profile_id: user.id,
          ...kycData
        });

      if (error) throw error;

      alert('Profile updated successfully');
      navigate('/client/client-dashboard');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="container mx-auto max-w-lg p-6 bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-2xl font-semibold text-gray-100 mb-4">Your Profile</h1>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Date of Birth</label>
          <input
            type="date"
            value={kycData.date_of_birth}
            onChange={(e) => handleChange('date_of_birth', e.target.value)}
            className="w-full px-4 py-2 bg-gray-600 text-gray-100 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Address Line 1</label>
          <input
            type="text"
            value={kycData.address_line1}
            onChange={(e) => handleChange('address_line1', e.target.value)}
            className="w-full px-4 py-2 bg-gray-600 text-gray-100 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Address Line 2</label>
          <input
            type="text"
            value={kycData.address_line2}
            onChange={(e) => handleChange('address_line2', e.target.value)}
            className="w-full px-4 py-2 bg-gray-600 text-gray-100 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">City</label>
          <input
            type="text"
            value={kycData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full px-4 py-2 bg-gray-600 text-gray-100 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Postal Code</label>
          <input
            type="text"
            value={kycData.postal_code}
            onChange={(e) => handleChange('postal_code', e.target.value)}
            className="w-full px-4 py-2 bg-gray-600 text-gray-100 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Phone Number</label>
          <input
            type="tel"
            value={kycData.phone_number}
            onChange={(e) => handleChange('phone_number', e.target.value)}
            className="w-full px-4 py-2 bg-gray-600 text-gray-100 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">National Insurance Number</label>
          <input
            type="text"
            value={kycData.national_insurance_number}
            onChange={(e) => handleChange('national_insurance_number', e.target.value)}
            className="w-full px-4 py-2 bg-gray-600 text-gray-100 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => navigate('/client/client-dashboard')}
            className="px-4 py-2 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className={`px-6 py-2 text-sm font-medium rounded-lg focus:outline-none ${
              isSaving
                ? 'bg-gray-500 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-gray-100 hover:bg-blue-600'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;