import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./ViewProfessionals.module.css";
import MentorCard from "./MentorCard";
import ProfessionalDetail from "./ProfessionalDetail";
import ScheduleMeeting from "./ScheduleMeeting";

export default function ViewProfessionals({ onClose, category = "Business" }) {
  const [professionals, setProfessionals] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [industryFilter, setIndustryFilter] = useState("");
  const [servicesFilter, setServicesFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const observerTarget = useRef(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [schedulingFor, setSchedulingFor] = useState(null);

  const fetchProfessionals = useCallback(async (pageToFetch, industry, services) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pageToFetch, limit: 12 });
      if (industry) params.append("industry", industry);
      if (services) params.append("services", services);
      const res = await fetch(`http://localhost:5050/api/professionals?${params}`);
      const data = await res.json();
      setProfessionals((prev) =>
        pageToFetch === 1 ? data.professionals : [...prev, ...data.professionals]
      );
      setTotalPages(data.totalPages);
    } catch (err) {
      console.log("Failed to fetch professionals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchProfessionals(1, industryFilter, servicesFilter);
  }, [industryFilter, servicesFilter, fetchProfessionals]);

  useEffect(() => {
    if (page > 1) {
      fetchProfessionals(page, industryFilter, servicesFilter);
    }
  }, [page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && page < totalPages) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1 }
    );
    const target = observerTarget.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [loading, page, totalPages]);

  const visibleProfessionals = professionals.filter((p) =>
    p.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h1 className={styles.title}>View Professionals</h1>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.filterPillWrap}>
          <select
            className={styles.filterPill}
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          >
            <option value="">View all Mentors</option>
            <option value="Technology">Mentors in Technology</option>
            <option value="Finance">Mentors in Finance</option>
            <option value="Healthcare">Mentors in Healthcare</option>
            <option value="Law">Mentors in Law</option>
            <option value="Engineering">Mentors in Engineering</option>
            <option value="Education">Mentors in Education</option>
            <option value="Business">Mentors in Business</option>
            <option value="Other">Other</option>
          </select>
          <svg className={styles.chevronIcon} xmlns="http://www.w3.org/2000/svg" width="13" height="24" viewBox="0 0 13 24" fill="none">
            <path opacity="0.8" d="M11.4198 21.7007L1.41967 11.5602L11.4198 1.41971" stroke="black" strokeWidth="2.83934" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className={styles.filterPillWrap}>
          <select
            className={styles.filterPill}
            value={servicesFilter}
            onChange={(e) => setServicesFilter(e.target.value)}
          >
            <option value="">Filter by services</option>
            <option value="Resume Review">Resume Review</option>
            <option value="Mock Interview">Mock Interview</option>
            <option value="General Career Advice">General Career Advice</option>
          </select>
          <svg className={styles.chevronIcon} xmlns="http://www.w3.org/2000/svg" width="13" height="24" viewBox="0 0 13 24" fill="none">
            <path opacity="0.8" d="M11.4198 21.7007L1.41967 11.5602L11.4198 1.41971" stroke="black" strokeWidth="2.83934" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <button
          type="button"
          className={styles.searchIconBtn}
          onClick={() => setSearchOpen((open) => !open)}
          aria-label="Toggle search"
        >
          <svg width="24" height="24" viewBox="0 0 42 42" fill="none">
            <path d="M37.6775 35.8225L30.9558 29.1007C33.2028 26.4355 34.5625 23.0002 34.5625 19.25C34.5625 10.8063 27.6937 3.9375 19.25 3.9375C10.8063 3.9375 3.9375 10.8063 3.9375 19.25C3.9375 27.6938 10.8063 34.5625 19.25 34.5625C23.0002 34.5625 26.4355 33.2027 29.1008 30.9557L35.8224 37.6775C36.0779 37.933 36.414 38.0625 36.75 38.0625C37.086 38.0625 37.4221 37.9347 37.6775 37.6775C38.1903 37.1665 38.1903 36.3353 37.6775 35.8225ZM6.5625 19.25C6.5625 12.2535 12.2535 6.5625 19.25 6.5625C26.2465 6.5625 31.9375 12.2535 31.9375 19.25C31.9375 27.6465 26.2465 31.9375 19.25 31.9375C12.2535 31.9375 6.5625 26.2465 6.5625 19.25Z" fill="#ADB5BD" />
          </svg>
        </button>
      </div>

      {searchOpen && (
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by name..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          autoFocus
        />
      )}

      <div className={styles.grid}>
        {visibleProfessionals.map((professional) => (
          <MentorCard
            key={professional.id}
            name={professional.name}
            jobTitle={professional.jobTitle}
            summary={professional.summary || "No summary provided yet."}
            photo={professional.photo}
            linkedin={professional.linkedin}
            website={professional.website}
            github={professional.github}
            onMoreClick={() => console.log("More clicked for:", professional.name)}
            onCardClick={() => setSelectedProfessional(professional)}
          />
        ))}
      </div>

      {visibleProfessionals.length === 0 && !loading && (
        <p className={styles.emptyText}>No professionals found for this filter.</p>
      )}
      {loading && <p className={styles.emptyText}>Loading more professionals...</p>}

      <div ref={observerTarget} style={{ height: "1px" }} />

      <ProfessionalDetail
        professional={selectedProfessional}
        onClose={() => setSelectedProfessional(null)}
        onSchedule={() => {
          setSchedulingFor(selectedProfessional);
          setSelectedProfessional(null);
        }}
      />

      <ScheduleMeeting
        professional={schedulingFor}
        onClose={() => setSchedulingFor(null)}
      />
    </div>
  );
}