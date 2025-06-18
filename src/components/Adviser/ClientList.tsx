// src/components/Adviser/ClientsList.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface Client {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

const ClientsList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);

  const fetchClients = async () => {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) console.error(error);
    else setClients(data as Client[]);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div>
      <h2>Your Clients</h2>
      <ul>
        {clients.map((client) => (
          <li key={client.id}>
            {client.name} ({client.email})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClientsList;
