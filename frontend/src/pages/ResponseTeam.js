// src/components/ResponseTeam.js
import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Button, Container, Box, AppBar, Toolbar, Typography, IconButton, MenuItem, Menu, Badge } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import polyline from '@mapbox/polyline';
import { useAuth } from '../contexts/AuthContext';
const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://newdispatchingbackend.onrender.com';

const vehicleIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="border-radius: 50%; width: 32px; height: 32px; display: flex; justify-content: center; align-items: center;">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H16V4C16 2.9 15.1 2 14 2H10C8.9 2 8 2.9 8 4V5H6.5C5.84 5 5.28 5.42 5.08 6.01L3 12V21C3 21.55 3.45 22 4 22H5C5.55 22 6 21.55 6 21V20H18V21C18 21.55 18.45 22 19 22H20C20.55 22 21 21.55 21 21V12L18.92 6.01ZM10 4H14V5H10V4ZM6.85 7H17.14L18.22 10H5.78L6.85 7ZM19 18C18.45 18 18 17.55 18 17C18 16.45 18.45 16 19 16C19.55 16 20 16.45 20 17C20 17.55 19.55 18 19 18ZM5 18C4.45 18 4 17.55 4 17C4 16.45 4.45 16 5 16C5.55 16 6 16.45 6 17C6 17.55 5.55 18 5 18ZM5 14V12H19V14H5Z" fill="black"/>
           </svg>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const codeRedIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const codeYellowIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const codeBlueIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41],
});


// Function to get marker icon based on emergency code
const getMarkerIcon = (emergencyCodee) => {
  switch (emergencyCodee) {
    case 'Code Red':
      return codeRedIcon;
    case 'Code Yellow':
      return codeYellowIcon;
    case 'Code Blue':
      return codeBlueIcon;
    default:
      return codeBlueIcon;
  }
};

const POLLING_INTERVAL = 10000; // 10 seconds

const ResponseTeam = () => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [confirmedReports, setConfirmedReports] = useState([]);
  const [route, setRoute] = useState([]);
  const [routeDetails, setRouteDetails] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  const { logout } = useAuth();

  const handleNotificationClick = (event) => setAnchorEl(event.currentTarget);
  const handleNotificationClose = () => setAnchorEl(null);
  const handleClearNotifications = () => {
    setNotifications([]);
    handleNotificationClose();
  };

  const fetchNotifications = async () => {
    const authData = JSON.parse(localStorage.getItem('authData'));
    if (authData && authData.id) {
      try {
        const response = await fetch(
          `https://newdispatchingbackend.onrender.com/api/notifications/${authData.id}`,
          {
            headers: {
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
            },
          }
        );
  
        if (response.status === 304) {
          console.log('Notifications not modified, using cached data.');
          return; // Notifications state remains unchanged
        }
  
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        } else {
          console.error('Failed to fetch notifications:', response.status);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    }
  };

  const fetchLocation = async () => {
    try {
      const authData = JSON.parse(localStorage.getItem('authData'));
      const teamId = authData.id;
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const { latitude, longitude } = position.coords;
      setCurrentPosition([latitude, longitude]);
      await axios.post('https://newdispatchingbackend.onrender.com/api/updateLocation', { latitude, longitude, teamId});
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const reportResponse = await axios.get('https://newdispatchingbackend.onrender.com/api/confirmedReports');
      setConfirmedReports([
        ...reportResponse.data.complaints,
        ...reportResponse.data.emergencies,
      ]);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchLocationAndReports = useCallback(async () => {
    await fetchLocation();
    await fetchNotifications();
    await fetchReports();
  }, []);

  useEffect(() => {
    fetchLocationAndReports();
    const intervalId = setInterval(fetchLocationAndReports, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchLocationAndReports]);

  const getDirections = async (report, index) => {
    if (!currentPosition) return;

    const [currentLat, currentLng] = currentPosition;
    const [reportLat, reportLng] = [report.Latitude, report.Longitude];
    const apiKey = 'pk.0fa1d8fd6faab9f422d6c5e37c514ce1';
    const profile = 'driving';
    const url = `https://us1.locationiq.com/v1/directions/${profile}/${currentLng},${currentLat};${reportLng},${reportLat}?key=${apiKey}&steps=true&geometries=polyline&overview=full`;

    try {
      const response = await axios.get(url);
      if (response.data.routes && response.data.routes.length > 0) {
        const routeData = response.data.routes[0];
        const coordinates = polyline.decode(routeData.geometry);
        const leafletCoordinates = coordinates.map(([lat, lng]) => [lat, lng]);
        setRoute(leafletCoordinates);

        const distance = (routeData.distance / 1000).toFixed(2); // in kilometers
        const duration = (routeData.duration / 60).toFixed(0); // in minutes
        setRouteDetails((prev) => ({
          ...prev,
          [index]: { distance, duration },
        }));
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
    }
  };

   // New function to handle resolving a report
   const resolveReport = async (name) => {
    // Extract resolver's firstName from authData in localStorage
    const authData = JSON.parse(localStorage.getItem('authData'));
    if (!authData || !authData.firstName) {
        console.error('No resolver first name found in auth data.');
        return;
    }
    try {
        await axios.post(`https://newdispatchingbackend.onrender.com/api/resolveReport`, {  name,
          resolverName: authData.firstName, // Pass resolver's first name
      });

        // Remove resolved report from state
        setConfirmedReports((prevReports) => prevReports.filter((report) => report.Name !== name));
    } catch (error) {
        console.error('Error resolving report:', error);
    }
};
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Response Team Dashboard
          </Typography>
          <IconButton color="inherit" onClick={handleNotificationClick} sx={{ mx: 1 }}>
            <Badge badgeContent={notifications.length} color="secondary">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleNotificationClose}>
            {notifications.length === 0 ? (
              <MenuItem>No new notifications</MenuItem>
            ) : (
              notifications.map((notification) => (
                <MenuItem key={notification.id}>{notification.message}</MenuItem>
              ))
            )}
            <MenuItem onClick={handleClearNotifications}>Clear all</MenuItem>
          </Menu>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Monitor Response Team
        </Typography>

        {currentPosition && (
          <Box sx={{ height: { xs: '400px', md: '600px' }, width: '100%', mb: 4 }}>
            <MapContainer center={currentPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={currentPosition} icon={vehicleIcon}>
                <Popup>Your Location</Popup>
              </Marker>
              {confirmedReports.map((report, index) => (
              <Marker
                key={index}
                position={[report.Latitude, report.Longitude]}
                icon={getMarkerIcon(report.EmergencyCodee)} // Dynamically select the marker icon
              >
                  <Popup>
                    <strong>Name:</strong> {report.Name} <br />
                    <strong>Address:</strong> {report.Address} <br />
                    <strong>Report:</strong> {report.EmergencyType || report.ComplaintType} <br />
                    {report.MediaUrl && (
                      report.MediaUrl.endsWith('.jpg') || report.MediaUrl.endsWith('.png') ? (
                        <img src={report.MediaUrl} alt="Media" style={{ maxWidth: '100px' }} />
                      ) : (
                        <a href={report.MediaUrl} target="_blank" rel="noopener noreferrer">View Media</a>
                      )
                    )}
                    {routeDetails[index] && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">Distance: {routeDetails[index].distance} km</Typography>
                        <Typography variant="body2">ETA: {routeDetails[index].duration} mins</Typography>
                      </Box>
                    )}                    <Typography> </Typography>
                    <Button variant="contained" onClick={() => getDirections(report, index)}>
                      Get Directions
                    </Button>
                    <Button
                       variant="contained"
                       color="success"
                       onClick={() => resolveReport(report.Name)}
                       sx={{ ml: 1 }}
                    >
                      Resolve
                    </Button>
                  </Popup>
                </Marker>
              ))}
              {route.length > 0 && <Polyline positions={route} color="blue" />}
            </MapContainer>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default ResponseTeam;
