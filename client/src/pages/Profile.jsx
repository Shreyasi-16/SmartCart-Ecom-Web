import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, updateProfile, signOut } from 'firebase/auth';
import './Profile.css';

const Profile = () => {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState('');

  // Listen for auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.photoURL) {
        setPreview(currentUser.photoURL);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedImage || !user) return;

    try {
      await updateProfile(user, {
        photoURL: preview,
      });
      alert('Profile photo updated (locally).');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update photo.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert('Logged out successfully!');
      setUser(null); // optional
      window.location.href = '/login'; // redirect to login page
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to log out.');
    }
  };

  return (
    <div className="profile-container">
      {user ? (
        <>
          <h1 className="profile-heading">Welcome, {user.displayName || 'User'}</h1>
          <p className="profile-email">Email: {user.email}</p>

          <div className="profile-image-container">
            <img
              src={preview || 'https://via.placeholder.com/150'}
              alt="Profile"
              className="profile-image"
            />
          </div>

          <label className="custom-file-upload">
            Upload New Photo
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>

          <button className="upload-button" onClick={handleUpload}>Save Photo</button>

          {/* 👇 Logout Button */}
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <p className="not-logged-in">You are not logged in.</p>
      )}
    </div>
  );
};

export default Profile;
