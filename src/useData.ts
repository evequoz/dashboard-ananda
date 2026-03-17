import { useState, useEffect } from 'react';

export const useN8nData = (webhookUrl: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(webhookUrl)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [webhookUrl]);

  return { data, loading };
};
