import { useState, useEffect } from 'react';
import { Users, Plus, X, CheckCircle, AlertCircle, Bell, Mail, DollarSign } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8006';

interface SplitShare {
  share_id: number;
  split_expense_id: number;
  user_id: number;
  amount: number;
  status: 'PENDING' | 'PAID' | 'CONFIRMED';
  description: string;
  total_amount: number;
  created_at: string;
  paid_at: string | null;
  confirmed_at: string | null;
  created_by_user_id: number;
  creator_name: string;
  creator_email: string;
  member_name: string;
  member_email: string;
}

interface UserSplits {
  splits_i_owe: SplitShare[];
  splits_owed_to_me: SplitShare[];
  total_i_owe: number;
  total_owed_to_me: number;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  related_id: number | null;
  is_read: number;
  created_at: string;
}

export default function DirectSplits() {
  const userDataStr = sessionStorage.getItem('expense_user');
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  const userId = userData?.id || 1;
  const userName = userData?.name || 'User';
  const userEmail = userData?.email || '';

  const [splits, setSplits] = useState<UserSplits | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateSplitModal, setShowCreateSplitModal] = useState(false);

  const [splitForm, setSplitForm] = useState({
    total_amount: '',
    description: '',
    member_emails: ['']
  });

  useEffect(() => {
    loadSplits();
    loadNotifications();
  }, []);

  const loadSplits = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/splits/me/${userId}`);
      if (response.data.success) {
        setSplits(response.data.splits);
      }
    } catch (error) {
      console.error('Failed to load splits:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/notifications/${userId}?unread_only=true`);
      if (response.data.success) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleCreateSplit = async () => {
    if (!splitForm.total_amount || !splitForm.description) {
      alert('Please fill in amount and description');
      return;
    }

    const validEmails = splitForm.member_emails.filter(e => e.trim() !== '');
    if (validEmails.length === 0) {
      alert('Please add at least one member email');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/splits/create`, {
        created_by_user_id: userId,
        total_amount: parseFloat(splitForm.total_amount),
        description: splitForm.description,
        member_emails: validEmails
      });

      if (response.data.success) {
        await loadSplits();
        await loadNotifications();
        setShowCreateSplitModal(false);
        setSplitForm({
          total_amount: '',
          description: '',
          member_emails: ['']
        });
        alert(`Split created! ${response.data.member_count} members, each owes $${response.data.share_amount.toFixed(2)}`);
      }
    } catch (error: any) {
      console.error('Failed to create split:', error);
      alert(error.response?.data?.detail?.message || 'Failed to create split');
    }
  };

  const handleMarkAsPaid = async (shareId: number) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/splits/${shareId}/mark-paid`, {
        user_id: userId
      });

      if (response.data.success) {
        await loadSplits();
        await loadNotifications();
        alert('Marked as paid! Waiting for creator confirmation.');
      }
    } catch (error: any) {
      console.error('Failed to mark as paid:', error);
      alert(error.response?.data?.detail?.message || 'Failed to mark as paid');
    }
  };

  const handleConfirmPayment = async (shareId: number) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/splits/${shareId}/confirm`, {
        user_id: userId
      });

      if (response.data.success) {
        await loadSplits();
        await loadNotifications();
        alert('Payment confirmed!');
      }
    } catch (error: any) {
      console.error('Failed to confirm payment:', error);
      alert(error.response?.data?.detail?.message || 'Failed to confirm payment');
    }
  };

  const markNotificationRead = async (notificationId: number) => {
    try {
      await axios.post(`${API_BASE_URL}/api/notifications/${notificationId}/read`);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/notifications/${userId}/read-all`);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const addEmailField = () => {
    setSplitForm({
      ...splitForm,
      member_emails: [...splitForm.member_emails, '']
    });
  };

  const removeEmailField = (index: number) => {
    setSplitForm({
      ...splitForm,
      member_emails: splitForm.member_emails.filter((_, i) => i !== index)
    });
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...splitForm.member_emails];
    newEmails[index] = value;
    setSplitForm({ ...splitForm, member_emails: newEmails });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      PAID: 'bg-blue-100 text-blue-800 border-blue-300',
      CONFIRMED: 'bg-green-100 text-green-800 border-green-300'
    };
    return badges[status as keyof typeof badges] || badges.PENDING;
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <Sidebar />
      
      <main className="flex-1 lg:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3.5 rounded-2xl shadow-lg">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Split Bills
                </h1>
                <p className="text-slate-600 mt-1">Email-based expense splitting</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setShowCreateSplitModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
              >
                <Plus className="w-5 h-5" />
                Create Split
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading splits...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border-2 border-red-200">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <h3 className="font-bold text-red-900">You Owe</h3>
                  </div>
                  <p className="text-4xl font-bold text-red-600">${splits?.total_i_owe?.toFixed(2) || '0.00'}</p>
                  <p className="text-sm text-red-700 mt-2">{splits?.splits_i_owe?.length || 0} pending payment(s)</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 border-2 border-emerald-200">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                    <h3 className="font-bold text-emerald-900">You'll Get Back</h3>
                  </div>
                  <p className="text-4xl font-bold text-emerald-600">${splits?.total_owed_to_me?.toFixed(2) || '0.00'}</p>
                  <p className="text-sm text-emerald-700 mt-2">{splits?.splits_owed_to_me?.length || 0} payment(s) to receive</p>
                </div>
              </div>

              {/* Splits I Owe */}
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                <h3 className="text-xl font-bold text-slate-900 mb-4">💸 You Owe</h3>
                {!splits || splits.splits_i_owe.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No pending payments</p>
                ) : (
                  <div className="space-y-3">
                    {splits.splits_i_owe.map((share) => (
                      <div key={share.share_id} className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-bold rounded-full border ${getStatusBadge(share.status)}`}>
                                {share.status}
                              </span>
                              <span className="text-xs text-slate-500">{new Date(share.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="font-bold text-red-900 text-lg">{share.description}</p>
                            <p className="text-sm text-red-700 mt-1">
                              Pay <span className="font-semibold">{share.creator_name}</span> ({share.creator_email})
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              Total: ${share.total_amount.toFixed(2)} • Your share: ${share.amount.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-3xl font-bold text-red-600">${share.amount.toFixed(2)}</p>
                            {share.status === 'PENDING' && (
                              <button
                                onClick={() => handleMarkAsPaid(share.share_id)}
                                className="mt-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                              >
                                Mark as Paid
                              </button>
                            )}
                            {share.status === 'PAID' && (
                              <p className="text-xs text-blue-700 mt-2">⏳ Awaiting confirmation</p>
                            )}
                            {share.status === 'CONFIRMED' && (
                              <p className="text-xs text-green-700 mt-2">✅ Payment confirmed</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Splits Owed to Me */}
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                <h3 className="text-xl font-bold text-slate-900 mb-4">💰 You'll Get Back</h3>
                {!splits || splits.splits_owed_to_me.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No pending payments to receive</p>
                ) : (
                  <div className="space-y-3">
                    {splits.splits_owed_to_me.map((share) => (
                      <div key={share.share_id} className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-bold rounded-full border ${getStatusBadge(share.status)}`}>
                                {share.status}
                              </span>
                              <span className="text-xs text-slate-500">{new Date(share.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="font-bold text-emerald-900 text-lg">{share.description}</p>
                            <p className="text-sm text-emerald-700 mt-1">
                              From <span className="font-semibold">{share.member_name}</span> ({share.member_email})
                            </p>
                            <p className="text-xs text-emerald-600 mt-1">
                              Total: ${share.total_amount.toFixed(2)} • Their share: ${share.amount.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-3xl font-bold text-emerald-600">${share.amount.toFixed(2)}</p>
                            {share.status === 'PAID' && (
                              <button
                                onClick={() => handleConfirmPayment(share.share_id)}
                                className="mt-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                Confirm Payment
                              </button>
                            )}
                            {share.status === 'PENDING' && (
                              <p className="text-xs text-yellow-700 mt-2">⏳ Waiting for payment</p>
                            )}
                            {share.status === 'CONFIRMED' && (
                              <p className="text-xs text-green-700 mt-2">✅ Payment confirmed</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Split Modal */}
      {showCreateSplitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Create New Split</h3>
              <button 
                onClick={() => setShowCreateSplitModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Total Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={splitForm.total_amount}
                  onChange={(e) => setSplitForm({ ...splitForm, total_amount: e.target.value })}
                  placeholder="150.00"
                  className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description *</label>
                <input
                  type="text"
                  value={splitForm.description}
                  onChange={(e) => setSplitForm({ ...splitForm, description: e.target.value })}
                  placeholder="Team Lunch at Restaurant"
                  className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-700">Member Emails *</label>
                  <button
                    onClick={addEmailField}
                    className="px-3 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Email
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                  <p className="text-xs text-blue-800">
                    💡 Include your own email ({userEmail}) if you're part of the split
                  </p>
                </div>

                <div className="space-y-3">
                  {splitForm.member_emails.map((email, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <Mail className="w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        placeholder="user@example.com"
                        className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {splitForm.member_emails.length > 1 && (
                        <button
                          onClick={() => removeEmailField(index)}
                          className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {splitForm.total_amount && splitForm.member_emails.filter(e => e.trim()).length > 0 && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <p className="text-sm text-purple-900 font-semibold">
                      Split among {splitForm.member_emails.filter(e => e.trim()).length} member(s)
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      Each person pays: ${(parseFloat(splitForm.total_amount) / splitForm.member_emails.filter(e => e.trim()).length).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateSplit}
                className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
              >
                Create Split
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Notifications</h3>
                  <p className="text-purple-100 text-sm mt-1">{unreadCount} unread</p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="px-3 py-1 text-xs bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">All caught up!</p>
                  <p className="text-slate-400 text-sm mt-2">No unread notifications</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className="p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-purple-300 cursor-pointer transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{notif.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                        <p className="text-xs text-slate-400 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
