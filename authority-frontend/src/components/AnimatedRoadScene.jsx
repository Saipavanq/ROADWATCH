import React from 'react';
import './AnimatedRoadScene.css';

export default function AnimatedRoadScene() {
  return (
    <div className="road-scene-container" aria-hidden="true">
      <div className="road-perspective">
        <div className="road">
          {/* Moving Dashed Line */}
          <div className="road-center-line"></div>
          
          {/* Crosswalk */}
          <div className="crosswalk">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="crosswalk-stripe"></div>
            ))}
          </div>

          {/* Traffic Light */}
          <div className="traffic-light-pole">
            <div className="traffic-light-box">
              <div className="light red"></div>
              <div className="light orange"></div>
              <div className="light green"></div>
            </div>
          </div>

          {/* People Crossing */}
          <div className="people-container">
            <div className="person person-1"></div>
            <div className="person person-2"></div>
            <div className="person person-3"></div>
            <div className="person person-4"></div>
          </div>
        </div>
      </div>
      <div className="road-overlay"></div>
    </div>
  );
}
