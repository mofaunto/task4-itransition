import React, { useState, useEffect } from 'react';
import {
  Container,
  Table,
  Form,
  Button,
  ButtonGroup,
  Alert,
  Spinner,
  OverlayTrigger,
  Tooltip,
  Navbar,
  Nav,
  Badge,
} from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  status: string;
  is_verified: boolean;
  last_login: string | null;
  created_at: string;
}

function getUniqIdValue(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { logout, user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
      setError('');
    } catch (err: any) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    getUniqIdValue();
  }, []);

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(''), 5000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 5000);
    }
  };

  const handleAction = async (action: string) => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      let response;
      const userIds = Array.from(selected);

      switch (action) {
        case 'block':
          if (userIds.length === 0) { showMessage('Select at least one user', true); return; }
          response = await api.post('/users/block', { userIds });
          showMessage(response.data.message);
          // If current user is in the blocked list, log out, better for UX
          if (currentUser && userIds.includes(currentUser.id)) {
            setTimeout(() => logout(), 1000);
            return;
          }
          break;
        case 'unblock':
          if (userIds.length === 0) { showMessage('Select at least one user', true); return; }
          response = await api.post('/users/unblock', { userIds });
          showMessage(response.data.message);
          break;
        case 'delete':
          if (userIds.length === 0) { showMessage('Select at least one user', true); return; }
          if (!window.confirm(`Delete ${userIds.length} user(s)? This cannot be undone.`)) return;
          response = await api.post('/users/delete', { userIds });
          showMessage(response.data.message);
          if (response.data.currentUserDeleted) {
            setTimeout(() => logout(), 1000);
            return;
          }
          break;
        case 'deleteUnverified':
          if (!window.confirm('Delete ALL unverified users?')) return;
          response = await api.post('/users/delete-unverified');
          showMessage(response.data.message);
          break;
        case 'verify':
          if (userIds.length === 0) { showMessage('Select at least one user to verify', true); return; }
          response = await api.post('/users/verify', { userIds });
          showMessage(response.data.message);
          break;
        default:
          return;
      }
      setSelected(new Set());
      await fetchUsers();
    } catch (err: any) {
      showMessage(err.response?.data?.error || `Failed to ${action} users`, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(new Set(users.map(u => u.id)));
    } else {
      setSelected(new Set());
    }
  };

  const handleSelectUser = (id: number) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  };

  const formatDate = (date: string | null) => date ? new Date(date).toLocaleString() : 'Never';

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      unverified: 'warning',
      active: 'success',
      blocked: 'danger',
    };
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>;
  };

  const isAllSelected = users.length > 0 && selected.size === users.length;

  return (
    <>
      <Navbar bg="dark" variant="dark" className="mb-4">
        <Container>
          <Navbar.Brand>User Management System</Navbar.Brand>
          <Nav className="ms-auto">
            <Navbar.Text className="me-3">Welcome, {currentUser?.name}</Navbar.Text>
            <Button variant="outline-light" size="sm" onClick={logout}>Logout</Button>
          </Nav>
        </Container>
      </Navbar>

      <Container fluid className="px-4">
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {/* Toolbar */}
        <div className="toolbar mb-3 p-3 bg-white rounded shadow-sm">
          <ButtonGroup>
            <OverlayTrigger placement="top" overlay={<Tooltip>Block selected users</Tooltip>}>
              <Button variant="danger" onClick={() => handleAction('block')} disabled={actionLoading || selected.size === 0}>
                Block
              </Button>
            </OverlayTrigger>
            <OverlayTrigger placement="top" overlay={<Tooltip>Unblock selected users</Tooltip>}>
              <Button variant="success" onClick={() => handleAction('unblock')} disabled={actionLoading || selected.size === 0}>
                <i className="bi bi-unlock"></i> Unblock
              </Button>
            </OverlayTrigger>
            <OverlayTrigger placement="top" overlay={<Tooltip>Delete selected users</Tooltip>}>
              <Button variant="danger" onClick={() => handleAction('delete')} disabled={actionLoading || selected.size === 0}>
                <i className="bi bi-trash"></i> Delete
              </Button>
            </OverlayTrigger>
            <OverlayTrigger placement="top" overlay={<Tooltip>Delete all unverified users</Tooltip>}>
              <Button variant="warning" onClick={() => handleAction('deleteUnverified')} disabled={actionLoading}>
                <i className="bi bi-trash-fill"></i> Delete unverified
              </Button>
            </OverlayTrigger>
            <OverlayTrigger placement="top" overlay={<Tooltip>Verify selected users (set to active)</Tooltip>}>
              <Button variant="info" onClick={() => handleAction('verify')} disabled={actionLoading || selected.size === 0}>
                <i className="bi bi-check-circle"></i> Verify
              </Button>
            </OverlayTrigger>
          </ButtonGroup>
          {actionLoading && <Spinner animation="border" size="sm" className="ms-3" />}
        </div>

        {/* Table */}
        <div className="table-responsive">
          <Table striped bordered hover className="align-middle">
            <thead className="table-dark">
              <tr>
                <th style={{ width: '50px' }}>
                  <Form.Check type="checkbox" checked={isAllSelected} onChange={handleSelectAll} />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Last Login</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-5">No users</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td className="text-center">
                      <Form.Check
                        type="checkbox"
                        checked={selected.has(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                      />
                    </td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{formatDate(user.last_login)}</td>
                    <td>{getStatusBadge(user.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Container>
    </>
  );
};

export default AdminPanel;