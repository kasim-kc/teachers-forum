import React, { useEffect, useState } from "react";
// import { useAuth } from "../context/AuthProvider";
import { toast } from "react-toastify";
import "./ProfilePage.css";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showPopup, setShowPopup] = useState(false);
  const [classroomName, setClassroomName] = useState("");
  const [description, setDescription] = useState("");
  const [classroomsCreatedByMe, setClassroomsCreatedByMe] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/auth/getuser`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();
        if (response.ok) {
          setUser(data.data);
        } else {
          toast.error(data.message || "Failed to fetch user data");
        }
      } catch (error) {
        toast.error("An error occurred while fetching user data");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/class/classroomscreatedbyme`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setClassroomsCreatedByMe(data.data);
      } else {
        toast.error(data.message || "Failed to fetch classrooms");
      }
    } catch (error) {
      toast.error("An error occurred while fetching classrooms");
    }
  };

  useEffect(() => {
    if (user) {
      fetchClassrooms();
    }
  }, [user]);

  const handleCreateClassroom = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/class/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: classroomName,
            description,
          }),
          credentials: "include",
        }
      );

      const data = response.json();

      if (response.ok) {
        toast.success("Classroom created successfully");
        setClassroomName("");
        setDescription("");
        setShowPopup(false);
        fetchClassrooms();
      } else {
        toast.error(data.message || "Failed to create classroom");
      }
    } catch (error) {
      toast.error("An error occurred while creating classroom");
    }
  };
  return (
    <div className="profile-page">
      {loading ? (
        <div className="loading">Loading...</div>
      ) : user ? (
        <>
          <h1>Profile</h1>
          <div className="profile-info">
            <img
              src={"" || "default-profile.png"}
              alt="Profile"
              className="profile-picture"
            />
            <div className="profile-details">
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <p>{user.role}</p>

              {user.role === "teacher" && (
                <button
                  className="create-classroom-btn"
                  onClick={() => setShowPopup(true)}
                >
                  Create Classroom
                </button>
              )}
            </div>
          </div>

          {showPopup && (
            <div className="popup-overlay">
              <div className="popup-content">
                <h3>Create Classroom</h3>
                <input
                  type="text"
                  placeholder="Classroom Name"
                  value={classroomName}
                  onChange={(e) => setClassroomName(e.target.value)}
                />
                <textarea
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <div className="popup-buttons">
                  <button onClick={handleCreateClassroom}>Submit</button>
                  <button onClick={() => setShowPopup(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {user.role === "teacher" ? (
            <div className="classroom-list">
              <h3>Classrooms created by me</h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {classroomsCreatedByMe.map((classroom) => (
                    <tr key={classroom._id}>
                      <td>{classroom.name}</td>
                      <td>{classroom.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="classroom-list">
              <h3>Classrooms joined by me</h3>
            </div>
          )}
        </>
      ) : (
        <p>No user data found.</p>
      )}
    </div>
  );
};

export default ProfilePage;
