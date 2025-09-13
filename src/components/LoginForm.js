// src/components/LoginForm.js
import React, { useState } from 'react';
import { 
  Container, 
  Card, 
  Form, 
  Button, 
  Alert, 
  Spinner, 
  InputGroup 
} from 'react-bootstrap';
import { FaEnvelope, FaEye, FaWineGlass, FaExclamationTriangle } from 'react-icons/fa';

const LoginForm = ({ onLogin, loading, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <Container fluid className="d-flex align-items-center justify-content-center min-vh-100"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Card className="shadow-lg border-0" style={{ borderRadius: '16px' }}>
          <Card.Body className="p-5">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="d-flex justify-content-center align-items-center mb-3">
                <div 
                  className="d-flex align-items-center justify-content-center me-2"
                  style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                >
                  <FaWineGlass size={24} />
                </div>
                <h1 className="h3 mb-0 fw-bold text-dark">Baires Inventory</h1>
              </div>
              <p className="text-muted mb-0">Accede a tu cuenta</p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="danger" className="d-flex align-items-center">
                <FaExclamationTriangle className="me-2" />
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold text-dark">
                  Correo Electrónico
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FaEnvelope className="text-muted" />
                  </InputGroup.Text>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="tu@email.com"
                    className="border-start-0"
                    autoComplete="email"
                    autoFocus={false}
                    spellCheck={false}
                    style={{ 
                      fontSize: '16px',
                      padding: '12px 16px'
                    }}
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold text-dark">
                  Contraseña
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FaEye className="text-muted" />
                  </InputGroup.Text>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="border-start-0"
                    autoComplete="current-password"
                    autoFocus={false}
                    spellCheck={false}
                    style={{ 
                      fontSize: '16px',
                      padding: '12px 16px'
                    }}
                  />
                </InputGroup>
              </Form.Group>

              <div className="d-grid mb-4">
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg"
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    padding: '12px',
                    fontWeight: '600'
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Ingresando...
                    </>
                  ) : (
                    'Ingresar al Sistema'
                  )}
                </Button>
              </div>
            </Form>

            <div className="text-center">
              <small className="text-muted">
                © 2025 Baires Inventory. Sistema de gestión integral.
              </small>
            </div>
          </Card.Body>
        </Card>

        {/* Información adicional */}
        <div className="text-center mt-4">
          <small className="text-muted">
            ¿Problemas para acceder? Contacta al administrador.
          </small>
        </div>
      </div>
    </Container>
  );
};

export default LoginForm;