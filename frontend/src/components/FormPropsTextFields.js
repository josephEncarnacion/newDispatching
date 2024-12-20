import React, { useState, useRef, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress'; // Progress bar
import axios from 'axios';
import CancelIcon from '@mui/icons-material/Cancel';
import { IconButton } from '@mui/material';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // Firebase Storage
import { storage } from '../pages/firebase';
const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://newdispatchingbackend.onrender.com';

const ComplaintForm = () => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [complaintType, setComplaintType] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [location, setLocation] = useState({ lat: 14.6507, lng: 121.1029 }); // Marikina coordinates
  const [locationError, setLocationError] = useState(null);
  const mapRef = useRef();
  const apiKey = 'pk.0fa1d8fd6faab9f422d6c5e37c514ce1'; // Your LocationIQ API key
  const [file, setFile] = useState(null); 
  const [ ,setFileUrl] = useState(''); 
  const [previewUrl, setPreviewUrl] = useState(''); 
  const [ ,setFileName] = useState(''); 
  const [uploading, setUploading] = useState(false); 
  const [uploadProgress, setUploadProgress] = useState(0);
  const [buttonText, setButtonText] = useState('Upload Media');

  const MAX_FILE_SIZE_MB = 200;
    // Get current date in 'YYYY-MM-DD' format
    const currentDate = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

  // Handle file selection and create a preview URL for images
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const fileSizeMB = selectedFile.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        alert(`File size exceeds ${MAX_FILE_SIZE_MB} MB. Please select a smaller file.`);
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile)); // Preview
      setFileName(`${selectedFile.name.replace(/\.[^/.]+$/, '')} - ${currentDate}${selectedFile.name.match(/\.[^/.]+$/)?.[0] || ''}`);
      simulateUpload(selectedFile);
    }
  };
  const simulateUpload = (file) => {
    setUploading(true);
    const storageRef = ref(storage, `media/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        setSnackbarMessage('Upload failed.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setUploading(false);
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        setFileUrl(downloadUrl);
        setButtonText('Uploaded Media');
        setUploading(false);
      }
    );
  };

  const handleCancel = () => {
    setFile(null);
    setUploadProgress(0);
    setButtonText('Upload Media');
    setPreviewUrl('');
  };


  // Custom Marker Icon
  const markerIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41],
  });

  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  const handleAddressChange = async (event) => {
    setAddress(event.target.value);
    if (event.target.value.length > 3) {
      try {
        const response = await axios.get(`https://us1.locationiq.com/v1/autocomplete.php?key=${apiKey}&q=${event.target.value}&format=json`);
        setAddressSuggestions(response.data);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
      }
    } else {
      setAddressSuggestions([]);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setAddress(suggestion.display_name);
    setLocation({ lat: suggestion.lat, lng: suggestion.lon });
    setAddressSuggestions([]);
    mapRef.current.flyTo([suggestion.lat, suggestion.lon], 15);
  };

  const handleComplaintTypeChange = (event) => {
    setComplaintType(event.target.value);
  };

  const handleComplaintChange = (event) => {
    setComplaintText(event.target.value);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLocationError(null);

        const url = `https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${latitude}&lon=${longitude}&format=json`;

        try {
          const response = await axios.get(url);
          const data = response.data;
          if (data && data.display_name) {
            setAddress(data.display_name);
          } else {
            setAddress('Address not found');
          }
        } catch (error) {
          console.error('Error fetching address:', error);
          setAddress('Error fetching address');
        }
      },
      () => {
        setLocationError('Unable to retrieve your location');
      }
    );
  };

  const handleSubmit = async () => {
    try {
      if (!file) {
        setSnackbarMessage('Please upload an image or video.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      // Upload file to Firebase Storage
      const storageRef = ref(storage, `media/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

     
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          setUploading(true);
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          setSnackbarMessage('Error uploading media.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          setUploading(false);
        },
        async () => {
          const mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setFileUrl(mediaUrl); // Set the uploaded media URL
          setUploading(false);
          const authData = JSON.parse(localStorage.getItem('authData'));
          const userId = authData.id; // Retrieve user ID from localStorage
          console.log(authData.id)

          // Submit form data with media URL
      const formData = {
        name,
        address,
        complaintType,
        complaintText,
        location,
        mediaUrl, // Include the media URL
        userId 
      };

      const response = await fetch('https://newdispatchingbackend.onrender.com/submitComplaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setSnackbarMessage(data.success ? 'Complaint report submitted successfully!' : 'Failed to submit complaint report.');
      setSnackbarSeverity(data.success ? 'success' : 'error');
      setSnackbarOpen(true);
    }
  );
    } catch (error) {
      console.error('Error submitting complaint:', error);
      setSnackbarMessage('Failed to submit complaint.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  useEffect(() => {
    const authData = JSON.parse(localStorage.getItem('authData'));
    if (authData) {
      const fullName = `${authData.firstName} ${authData.lastName}`;
      setName(fullName); // Set the user's full name as the initial value
    }
  }, []);

  // Handle name change

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        mt: 4,
        px: { xs: 2, md: 4 },
        maxWidth: '1200px',
        margin: 'auto',
      }}
    >
      <Box
        sx={{
          width: '100%',
          padding: { xs: 2, md: 4 },
          boxShadow: 2,
          borderRadius: 4,
          backgroundColor: 'background.paper',
          textAlign: 'center',
        }}
      >
        <Typography align="center" variant="h5" gutterBottom>
          Complaint Form
        </Typography>

        <TextField 
         label="Complainant"
         variant="outlined" 
         fullWidth value={name}
         onChange={handleNameChange}
         margin="normal" sx={{ mb: 2 }} />

        <TextField
          label="Address"
          variant="outlined"
          fullWidth
          value={address}
          onChange={handleAddressChange}
          margin="normal"
          autoComplete="off"
          sx={{ mb: 2 }}
        />
        {addressSuggestions.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              zIndex: 1000,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {addressSuggestions.map((suggestion, index) => (
              <Box
                key={index}
                sx={{
                  padding: 1,
                  cursor: 'pointer',
                  borderBottom: '1px solid #ccc',
                  '&:hover': { backgroundColor: '#f0f0f0' },
                }}
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                {suggestion.display_name}
              </Box>
            ))}
          </Box>
        )}
        <Box marginTop={2} marginBottom={2}>
          <Button variant="contained" color="primary" onClick={handleGetLocation}>
            Get My Current Location
          </Button>
          {locationError && (
            <Typography variant="body1" color="error" marginTop={2}>
              {locationError}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            height: { xs: '200px', md: '400px' },
            mb: 2,
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <MapContainer
            center={[location.lat, location.lng]}
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker position={[location.lat, location.lng]} icon={markerIcon} />
          </MapContainer>
        </Box>

        <FormControl fullWidth margin="normal" variant="outlined" sx={{ mb: 2 }}>
          <InputLabel id="complaint-type-label">Complaint Type</InputLabel>
          <Select
            labelId="complaint-type-label"
            id="complaint-type"
            value={complaintType}
            onChange={handleComplaintTypeChange}
            label="Complaint Type"
          >
            <MenuItem value="Noise Disturbances"> Noise Disturbances</MenuItem>
            <MenuItem value="Garbage Issues">Garbage Issues</MenuItem>
            <MenuItem value="Street Light Outage">Street Light Outage</MenuItem>
            <MenuItem value="Pet Issues">Pet Issues</MenuItem>
            <MenuItem value="Illegal Parking">Illegal Parking</MenuItem>
            <MenuItem value="Traffic Violation">Traffic Violation</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Complaint Description"
          variant="outlined"
          fullWidth
          value={complaintText}
          onChange={handleComplaintChange}
          margin="normal"
          multiline
          rows={4}
          sx={{ mb: 2 }}
        />

        <Typography variant="caption" align="left" sx={{ mb: 1, display: 'block' }}>
          The Maximum total size of the file is {MAX_FILE_SIZE_MB} MB.
        </Typography>
        <Typography variant="caption" align="left" sx={{ mb: 1, display: 'block' }}>
          Supported media file types include .jpg, .jpeg, .gif, .png, .mp3, and .mp4.
        </Typography>
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Button variant="contained" component="label">
            {buttonText}
            <input type="file" hidden accept="image/*,video/*" onChange={handleFileChange} />
          </Button>
          {file && (
            <Box sx={{ mt: 2, width: '100%', position: 'relative' }}>
               <Typography variant="body2" sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
               <span>
                {file.name.replace(/\.[^/.]+$/, '')} - {currentDate}
                {file.name.match(/\.[^/.]+$/)?.[0] || ''}
              </span>     
              <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span> {/* File size in MB */}
              </Typography>
              <br/>
              <Box sx={{ position: 'relative', height: '12px', borderRadius: '8px', backgroundColor: '#e0e0e0', overflow: 'hidden', mb: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{   
                  height: '100%', 
                  borderRadius: '8px', 
                  '& .MuiLinearProgress-bar': { 
                    backgroundColor: '#3f51b5' 
                  } 
                }} 
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  color: 'white', 
                  fontWeight: 'bold' 
                }}
              >
                {uploadProgress.toFixed(1)}%
              </Typography>
              </Box>
              <IconButton
                    onClick={handleCancel}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: '-8px', // Adjust to move the button up slightly
                      right: '-8px', // Adjust to move the button right and out of overlap
                      backgroundColor: 'rgba(0, 0, 0, 0.1)', // Add slight background for better visibility
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      },
                    }}
                  >
                    <CancelIcon />
              </IconButton>
            </Box>
          )}
          {previewUrl && (
            <Box sx={{ mt: 2, border: '1px solid #ccc', borderRadius: '4px', padding: 2 }}>
              <Typography variant="body1">Media Preview:</Typography>
              {file.type.startsWith('image/') ? (
                <img src={previewUrl} alt="Selected file preview" style={{ maxWidth: '100%' }} />
              ) : (
                <video src={previewUrl} controls style={{ maxWidth: '100%' }} />
              )}
            </Box>
          )}
        </Box>

        <Box marginTop={2}>
          <Button variant="contained" color="primary" onClick={handleSubmit}>Submit Complaint </Button>
        </Box>
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ComplaintForm;
