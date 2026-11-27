import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useLiveNotifications = () => {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('smartcrm_token');
    if (!token) return;

    const streamUrl = `http://localhost:5001/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.addEventListener('payment_received', (e) => {
      try {
        const payload = JSON.parse(e.data);
        const data = payload.data || {};
        toast.success(`💰 Payment Received: $${Number(data.amount || 0).toFixed(2)} from ${data.customerName || 'Customer'}`, {
          description: `Invoice ${data.invoiceNumber || ''} settled via ${data.source || 'Payment Gateway'}.`,
          duration: 6000,
        });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['payments'] });
      } catch (err) {
        console.error('Error parsing payment event:', err);
      }
    });

    es.addEventListener('ticket_created', (e) => {
      try {
        const payload = JSON.parse(e.data);
        const data = payload.data || {};
        toast.info(`🎫 New Support Ticket: ${data.ticketNumber || ''}`, {
          description: `"${data.subject}" from ${data.customerName || 'Client'}.`,
          duration: 5000,
        });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      } catch (err) {
        console.error('Error parsing ticket event:', err);
      }
    });

    es.addEventListener('deal_won', (e) => {
      try {
        const payload = JSON.parse(e.data);
        const data = payload.data || {};
        toast.success(`🎉 Deal Closed Won! ${data.title || ''}`, {
          description: `Value: $${Number(data.value || 0).toLocaleString()} (Stage updated)`,
          duration: 6000,
        });
        queryClient.invalidateQueries({ queryKey: ['deals'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      } catch (err) {
        console.error('Error parsing deal won event:', err);
      }
    });

    es.onerror = () => {
      // EventSource automatically retries connection drops
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [queryClient]);
};
