import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <Row>
        <Col className="text-center">
          <h1 className="display-3 mb-4">User Management System</h1>
          <div className="d-flex gap-3 justify-content-center">
            <Link to="/login">
              <Button variant="primary" size="lg">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button variant="outline-primary" size="lg">Sign Up</Button>
            </Link>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Landing;