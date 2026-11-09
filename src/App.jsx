
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";

import L from "leaflet";

import {
  Search,
  MapPin,
  Navigation,
  Utensils,
  Building2,
  Coffee,
  LocateFixed,
  Clock,
  Menu,
  X
} from "lucide-react";

import "leaflet/dist/leaflet.css";
import "./App.css";

// Campus sample coordinates.
// Replace these with your university's actual coordinates.

const buildings = [
  {
    id: 1,
    name: "Academic Block",
    category: "Education",
    description: "Main academic building for lectures and classrooms.",
    latitude: 28.4500,
    longitude: 77.5000
  },
  {
    id: 2,
    name: "Library",
    category: "Study",
    description: "Quiet study area with books and reading spaces.",
    latitude: 28.4510,
    longitude: 77.5010
  },
  {
    id: 3,
    name: "Cafeteria",
    category: "Food",
    description: "Campus food court with snacks and meals.",
    latitude: 28.4520,
    longitude: 77.5020
  },
  {
    id: 4,
    name: "Auditorium",
    category: "Events",
    description: "Venue for university events and presentations.",
    latitude: 28.4530,
    longitude: 77.5030
  }
];

const amenities = [
  {
    name: "Library",
    type: "Study Space",
    icon: "📚",
    location: "Library Building"
  },
  {
    name: "Washrooms",
    type: "Facilities",
    icon: "🚻",
    location: "Academic Block"
  },
  {
    name: "Medical Room",
    type: "Healthcare",
    icon: "🏥",
    location: "Main Campus"
  },
  {
    name: "Parking",
    type: "Transport",
    icon: "🅿️",
    location: "Campus Entrance"
  },
  {
    name: "Cafeteria",
    type: "Food",
    icon: "🍽️",
    location: "Food Court"
  },
  {
    name: "ATM",
    type: "Banking",
    icon: "🏧",
    location: "Main Building"
  }
];

const foodOutlets = [
  {
    name: "Campus Cafe",
    cuisine: "Coffee & Snacks",
    time: "9 AM – 6 PM",
    items: [
      { name: "Coffee", price: "₹40" },
      { name: "Sandwich", price: "₹80" },
      { name: "Cold Coffee", price: "₹70" }
    ]
  },
  {
    name: "Food Court",
    cuisine: "Indian & Fast Food",
    time: "10 AM – 7 PM",
    items: [
      { name: "Veg Burger", price: "₹90" },
      { name: "Momos", price: "₹60" },
      { name: "Chole Kulche", price: "₹100" }
    ]
  },
  {
    name: "Juice Corner",
    cuisine: "Juices & Beverages",
    time: "10 AM – 5 PM",
    items: [
      { name: "Fresh Juice", price: "₹50" },
      { name: "Lemon Soda", price: "₹40" },
      { name: "Milkshake", price: "₹80" }
    ]
  }
];

const customIcon = L.divIcon({
  className: "custom-marker",
  html: `<div class="marker-pin">📍</div>`,
  iconSize: [35, 35],
  iconAnchor: [17, 35]
});

function MapController({ userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 17, {
        duration: 1
      });
    }
  }, [userLocation, map]);

  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("Map");
  const [search, setSearch] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);

  const filteredBuildings = buildings.filter((building) =>
    building.name.toLowerCase().includes(search.toLowerCase())
  );

  function getUserLocation() {
    if (!navigator.geolocation) {
      alert("GPS is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude
        ]);
      },
      () => {
        alert("Please allow location access in your browser.");
      }
    );
  }

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className={`sidebar ${showMenu ? "open" : ""}`}>

        <div className="logo">
          <div className="logo-icon">
            <Navigation size={24} />
          </div>

          <div>
            <h2>CampusFind</h2>
            <p>Navigate your campus</p>
          </div>

          <button
            className="close-menu"
            onClick={() => setShowMenu(false)}
          >
            <X />
          </button>
        </div>

        <div className="sidebar-label">
          EXPLORE
        </div>

        <nav>
          {[
            { name: "Map", icon: <MapPin /> },
            { name: "Amenities", icon: <Building2 /> },
            { name: "Food", icon: <Utensils /> }
          ].map((tab) => (
            <button
              key={tab.name}
              className={`nav-item ${
                activeTab === tab.name ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab(tab.name);
                setShowMenu(false);
              }}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">💡</div>
            <h3>Lost on campus?</h3>
            <p>Find your destination quickly and easily.</p>
          </div>

          <p className="footer-text">
            CampusFind © 2026
          </p>
        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="main-content">

        <header className="topbar">

          <button
            className="menu-button"
            onClick={() => setShowMenu(true)}
          >
            <Menu />
          </button>

          <div>
            <h1>
              {activeTab === "Map"
                ? "Explore Campus"
                : activeTab === "Amenities"
                ? "Campus Amenities"
                : "Campus Food"}
            </h1>

            <p>
              Discover places, facilities and food around you.
            </p>
          </div>

          <button
            className="location-button"
            onClick={getUserLocation}
          >
            <LocateFixed size={18} />
            <span>My Location</span>
          </button>

        </header>

        {/* SEARCH */}

        <div className="search-container">
          <Search size={20} />

          <input
            type="text"
            placeholder="Search buildings, places..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <button onClick={() => setSearch("")}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* MAP SECTION */}

        {activeTab === "Map" && (

          <div className="map-layout">

            <section className="map-section">

              <div className="map-heading">
                <div>
                  <h2>Campus Map</h2>
                  <p>Explore important campus locations</p>
                </div>

                <span className="live-badge">
                  ● Interactive
                </span>
              </div>

              <div className="map-wrapper">

                <MapContainer
                  center={[28.4500, 77.5000]}
                  zoom={16}
                  scrollWheelZoom={true}
                  className="campus-map"
                >

                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapController userLocation={userLocation} />

                  {filteredBuildings.map((building) => (

                    <Marker
                      key={building.id}
                      position={[
                        building.latitude,
                        building.longitude
                      ]}
                      icon={customIcon}
                      eventHandlers={{
                        click: () =>
                          setSelectedBuilding(building)
                      }}
                    >

                      <Popup>
                        <strong>{building.name}</strong>
                        <br />
                        {building.description}
                      </Popup>

                    </Marker>

                  ))}

                  {userLocation && (

                    <Marker position={userLocation}>
                      <Popup>
                        You are here!
                      </Popup>
                    </Marker>

                  )}

                </MapContainer>

                <button
                  className="map-location-button"
                  onClick={getUserLocation}
                >
                  <LocateFixed size={20} />
                </button>

              </div>

            </section>

            {/* BUILDING LIST */}

            <section className="places-panel">

              <div className="places-heading">
                <h2>Campus Places</h2>
                <span>{filteredBuildings.length} places</span>
              </div>

              <div className="places-list">

                {filteredBuildings.map((building) => (

                  <button
                    key={building.id}
                    className={`place-card ${
                      selectedBuilding?.id === building.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => setSelectedBuilding(building)}
                  >

                    <div className="place-icon">
                      <Building2 size={22} />
                    </div>

                    <div className="place-info">
                      <h3>{building.name}</h3>
                      <p>{building.category}</p>
                    </div>

                    <Navigation size={18} />

                  </button>

                ))}

                {filteredBuildings.length === 0 && (
                  <p className="empty-message">
                    No places found.
                  </p>
                )}

              </div>

              {selectedBuilding && (

                <div className="destination-card">

                  <div className="destination-top">
                    <span>SELECTED DESTINATION</span>

                    <button
                      onClick={() => setSelectedBuilding(null)}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <h3>{selectedBuilding.name}</h3>

                  <p>{selectedBuilding.description}</p>

                  <button
                    className="destination-button"
                    onClick={getUserLocation}
                  >
                    <Navigation size={17} />
                    Locate Me
                  </button>

                </div>

              )}

            </section>

          </div>

        )}

        {/* AMENITIES */}

        {activeTab === "Amenities" && (

          <section className="content-section">

            <div className="section-heading">
              <h2>Campus Facilities</h2>
              <p>Everything you need around campus.</p>
            </div>

            <div className="amenities-grid">

              {amenities
                .filter((amenity) =>
                  amenity.name.toLowerCase().includes(
                    search.toLowerCase()
                  )
                )
                .map((amenity) => (

                  <div className="amenity-card" key={amenity.name}>

                    <div className="amenity-icon">
                      {amenity.icon}
                    </div>

                    <h3>{amenity.name}</h3>

                    <p>{amenity.type}</p>

                    <div className="amenity-location">
                      <MapPin size={15} />
                      {amenity.location}
                    </div>

                  </div>

                ))}

            </div>

          </section>

        )}

        {/* FOOD */}

        {activeTab === "Food" && (

          <section className="content-section">

            <div className="section-heading">
              <h2>Food Around Campus</h2>
              <p>Explore outlets and their available menus.</p>
            </div>

            <div className="food-grid">

              {foodOutlets
                .filter((outlet) =>
                  outlet.name.toLowerCase().includes(
                    search.toLowerCase()
                  )
                )
                .map((outlet) => (

                  <div className="food-card" key={outlet.name}>

                    <div className="food-card-top">
                      <div className="food-icon">
                        <Coffee size={25} />
                      </div>

                      <span className="open-badge">
                        ● Listed
                      </span>
                    </div>

                    <h3>{outlet.name}</h3>

                    <p>{outlet.cuisine}</p>

                    <div className="food-time">
                      <Clock size={16} />
                      {outlet.time}
                    </div>

                    <button
                      className="menu-button"
                      onClick={() =>
                        setSelectedFood(
                          selectedFood === outlet.name
                            ? null
                            : outlet.name
                        )
                      }
                    >
                      {selectedFood === outlet.name
                        ? "Hide Menu"
                        : "View Menu"}
                    </button>

                    {selectedFood === outlet.name && (

                      <div className="menu-list">

                        {outlet.items.map((item) => (

                          <div
                            className="menu-item"
                            key={item.name}
                          >
                            <span>{item.name}</span>
                            <strong>{item.price}</strong>
                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                ))}

            </div>

          </section>

        )}

        <footer className="main-footer">
          Made for students, by students.
        </footer>

      </main>

    </div>
  );
}
