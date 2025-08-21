import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./HomePage.css";

const HomePage = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/class/classroomsforstudent`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();
      console.log(data);

      if (response.ok) {
        setClassrooms(data.data || []);
      } else {
        toast.error(data.message || "Failed to fetch classrooms");
      }
    } catch (error) {
      toast.error("An error occurred while fetching classrooms");
    } finally {
      setLoading(false);
    }
  };

  const handleClassroomClick = (classroomId) => {
    navigate(`/classes/${classroomId}`);
  };

  if (loading) {
    return (
      <div className="homepage-container">
        <div className="loading">Loading classrooms...</div>
      </div>
    );
  }

  return (
    <div className="homepage-container">
      <header className="homepage-header">
        <h1>My Classrooms</h1>
        <p>Welcome back! Here are the classrooms you've joined.</p>
      </header>

      {classrooms.length === 0 ? (
        <div className="empty-state">
          <h2>You haven't joined any classrooms yet</h2>
          <p>
            Join classrooms to start learning and collaborating with teachers
          </p>
          <button
            className="browse-btn"
            onClick={() => navigate("/browse-classrooms")}
          >
            Browse Classrooms
          </button>
        </div>
      ) : (
        <div className="classrooms-grid">
          {classrooms.map((classroom) => (
            <div
              key={classroom._id}
              className="classroom-card"
              onClick={() => handleClassroomClick(classroom._id)}
            >
              <div className="card-header">
                <h3>{classroom.name}</h3>
                <span className="teacher-name">
                  {classroom.owner?.name || "Teacher Kasim"}
                </span>
              </div>
              <div className="card-body">
                <p className="classroom-description">
                  {classroom.description || "No description available"}
                </p>
                <div className="classroom-stats">
                  <div className="stat">
                    <span className="stat-value">
                      {classroom.posts.length || 0}
                    </span>
                    <span className="stat-label">Assignments</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">
                      {classroom.students.length || 0}
                    </span>
                    <span className="stat-label">Students</span>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <span>
                  Joined: {new Date(classroom.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
