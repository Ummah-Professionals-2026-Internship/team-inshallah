import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../forms.css';
import logo from '../assets/Brand Kit/Logos/PNGs/horizontal blue.png';
import bg from '../assets/Brand Kit/careerprep-bg.png';

const REGIONS = ['+1', '+44', '+92', '+971', '+966', '+20', '+234'];

export default function ProfessionalForm() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        phoneRegion: '+1',
        phone: '',
        gender: '',
        experienceLevel: '',
        employer: '',
        jobTitle: '',
        industry: '',
        volunteeringFor: [],
        major: '',
        almaMater: '',
        mentorOpposingGender: '',
        countyState: '',
        hearAboutService: '',
        otherInformation: '',
        resume: null,
    });


    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState(null);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }


    function validate() {
        const errors = {};
        if (!form.name.trim()) {
            errors.name = 'Name is required.';
        }
        else if (!/^[a-zA-Z\s'-]+$/.test(form.name.trim())) {
            errors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes.';
        }

        if (!form.phone.trim()) {
            errors.phone = 'Phone number is required.';
        }
        else if (!/^\d{7,15}$/.test(form.phone.replace(/[\s\-()]/g, ''))) {
            errors.phone = 'Please enter a valid phone number (digits only).';
        }
        if (!form.gender) errors.gender = 'Please select a gender.';
        if (!form.experienceLevel) errors.experienceLevel = 'Please select your experience level.';
        if (!form.employer.trim()) errors.employer = 'Employer is required.';
        if (!form.jobTitle.trim()) errors.jobTitle = 'Job title is required.';
        if (!form.industry) errors.industry = 'Please select an industry.';
        if (form.volunteeringFor.length === 0) errors.volunteeringFor = 'Please select at least one option.';
        if (!form.mentorOpposingGender) errors.mentorOpposingGender = 'Please select an option.';
        if (!form.countyState.trim()) errors.countyState = 'County / State is required.';
        if (!form.hearAboutService) errors.hearAboutService = 'Please select how you heard about us.';
        if (!form.resume) {
            errors.resume = 'Please upload your résumé.';
        }
        else {
            const okTypes = ['.pdf', '.doc', '.docx'];
            const name = form.resume.name.toLowerCase();
            if (!okTypes.some(ext => name.endsWith(ext))) {
                errors.resume = 'Résumé must be a PDF or Word document.';
            }
        }
        return errors;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        setStatus('submitting');

        try {
            const fd = new FormData();
            fd.append('name', form.name);
            fd.append('phone', form.phoneRegion + form.phone);
            fd.append('gender', form.gender);
            fd.append('experienceLevel', form.experienceLevel);
            fd.append('employer', form.employer);
            fd.append('jobTitle', form.jobTitle);
            fd.append('industry', form.industry);
            fd.append('volunteeringFor', JSON.stringify(form.volunteeringFor));
            fd.append('major', form.major);
            fd.append('almaMater', form.almaMater);
            fd.append('mentorOpposingGender', form.mentorOpposingGender);
            fd.append('countyState', form.countyState);
            fd.append('hearAboutService', form.hearAboutService);
            fd.append('otherInformation', form.otherInformation);
            fd.append('resume', form.resume);

            const res = await fetch('/api/professional', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: fd,
            }); 

        if (!res.ok) throw new Error('Submission failed.');
        setStatus('success');
        navigate('/professional-dashboard');
    } catch (err) {
        setStatus('error');
    }
}

return (

    <div className="page-background" style={{ backgroundImage: `url(${bg})` }}>
        <div className="form-container">
            <form onSubmit={handleSubmit}>
                <img src={logo} alt="Ummah Professionals" style={{ width: '150px' }} />
                <h1>Career Prep Services</h1>
                <h2>Professional Form</h2>

                <label>Name <span className="required">*</span></label>
                <input name="name" value={form.name} onChange={handleChange} />
                {errors.name && <p className="error-msg">{errors.name}</p>}

                <label>Phone Number <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <select name="phoneRegion" value={form.phoneRegion} onChange={handleChange}>
                        {REGIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                    <input name="phone" value={form.phone} onChange={handleChange} />
                </div>
                {errors.phone && <p className="error-msg">{errors.phone}</p>}

                {/*Gender field*/}
                <label>Gender <span className="required">*</span></label>
                <div className="gender-toggle">
                    <button
                        type="button"
                        className={form.gender === 'Brother' ? 'active' : ''}
                        onClick={() => setForm({ ...form, gender: 'Brother' })}
                    >
                        Brother
                    </button>
                    <button
                        type="button"
                        className={form.gender === 'Sister' ? 'active' : ''}
                        onClick={() => setForm({ ...form, gender: 'Sister' })}
                    >
                        Sister
                    </button>
                </div>
                {errors.gender && <p className="error-msg">{errors.gender}</p>}


                {/*Experience Level Field*/}
                <label>Experience Level <span className="required">*</span></label>
                <select name="experienceLevel" value={form.experienceLevel} onChange={handleChange}>
                    <option value="">Select</option>
                    <option>0-2 years</option>
                    <option>3-5 years</option>
                    <option>6-10 years</option>
                    <option>10+ years</option>
                </select>
                {errors.experienceLevel && <p className="error-msg">{errors.experienceLevel}</p>}

                {/*Employer Field*/}
                <label>Employer <span className="required">*</span></label>
                <input name="employer" value={form.employer} onChange={handleChange} />
                {errors.employer && <p className="error-msg">{errors.employer}</p>}

                {/*Job Title Field*/}
                <label>Job Title <span className="required">*</span></label>
                <input name="jobTitle" value={form.jobTitle} onChange={handleChange} />
                {errors.jobTitle && <p className="error-msg">{errors.jobTitle}</p>}

                {/*Industry Field*/}
                <label>Industry <span className="required">*</span></label>
                <select name="industry" value={form.industry} onChange={handleChange}>
                    <option value="">Select industry</option>
                    <option>Technology</option>
                    <option>Finance</option>
                    <option>Healthcare</option>
                    <option>Law</option>
                    <option>Engineering</option>
                    <option>Education</option>
                    <option>Business</option>
                    <option>Other</option>
                </select>
                {errors.industry && <p className="error-msg">{errors.industry}</p>}



                {/*Volunteering For Field*/}
                <label>Volunteering For <span className="required">*</span></label>
                <p className="field-subtitle">Which of the following services would you like to participate in.</p>
                <div className="checkbox-group">
                    {['Résumé Review', 'Mock Interview', 'General Career Advice'].map(option => (
                        <label key={option} className="checkbox-item">
                            <input
                                type="checkbox"
                                checked={form.volunteeringFor.includes(option)}
                                onChange={() => {
                                    const updated = form.volunteeringFor.includes(option)
                                        ? form.volunteeringFor.filter(item => item !== option)
                                        : [...form.volunteeringFor, option];
                                    setForm({ ...form, volunteeringFor: updated });
                                }}
                            />
                            {option}
                        </label>
                    ))}
                </div>
                {errors.volunteeringFor && <p className="error-msg">{errors.volunteeringFor}</p>}



                {/*Major Field*/}
                <label>Major</label>
                <p className="field-subtitle">Undergraduate and/or graduate majors.</p>
                <input name="major" value={form.major} onChange={handleChange} />

                <label>Alma Mater</label>
                <p className="field-subtitle">Please list all universities for both undergraduate and graduate studies.</p>
                <input name="almaMater" value={form.almaMater} onChange={handleChange} />


                {/*Opposite Gender Mentoring Field*/}
                <label>Would you like to mentor students of the opposing gender? <span className="required">*</span></label>
                <div className="gender-toggle">
                    <button
                        type="button"
                        className={form.mentorOpposingGender === 'Yes' ? 'active' : ''}
                        onClick={() => setForm({ ...form, mentorOpposingGender: 'Yes' })}
                    >
                        Yes
                    </button>
                    <button
                        type="button"
                        className={form.mentorOpposingGender === 'No' ? 'active' : ''}
                        onClick={() => setForm({ ...form, mentorOpposingGender: 'No' })}
                    >
                        No
                    </button>
                </div>
                {errors.mentorOpposingGender && <p className="error-msg">{errors.mentorOpposingGender}</p>}


                {/*County/State Field*/}
                <label>County / State <span className="required">*</span></label>
                <p className="field-subtitle">This will be used when planning in-person events at colleges.</p>
                <input name="countyState" value={form.countyState} onChange={handleChange} />
                {errors.countyState && <p className="error-msg">{errors.countyState}</p>}

                {/*Hear About Us Field*/}
                <label>How did you hear about us? <span className="required">*</span></label>
                <select name="hearAboutService" value={form.hearAboutService} onChange={handleChange}>
                    <option value="">Select</option>
                    <option>Word of Mouth</option>
                    <option>Friend or family member</option>
                    <option>My MSA</option>
                    <option>Campus flyer or event</option>
                    <option>LinkedIn</option>
                    <option>Instagram</option>
                    <option>Other</option>
                </select>
                {errors.hearAboutService && <p className="error-msg">{errors.hearAboutService}</p>}

                {/*Resume Field*/}
                <label>Résumé <span className="required">*</span></label>
                <div className="resume-drop">
                    <input
                        type="file"
                        name="resume"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setForm({ ...form, resume: e.target.files[0] })}
                    />
                    {form.resume ? (
                        <>
                            <p style={{ color: 'green', fontWeight: 'bold' }}>✅ {form.resume.name}</p>
                            <p className="resume-hint">Click to change file</p>
                        </>
                    ) : (
                        <>
                            <p>Click to upload or drag and drop</p>
                            <p className="resume-hint">PDF or Word (.doc, .docx)</p>
                        </>
                    )}
                </div>
                {errors.resume && <p className="error-msg">{errors.resume}</p>}

                {/*Other information field*/}
                <div className="other-info">
                    <div>
                        <h3>Other Information</h3>
                        <p>Any additional information you'd like to share (optional)</p>
                    </div>
                </div>
                <textarea
                    name="otherInformation"
                    value={form.otherInformation}
                    onChange={handleChange}
                    placeholder="Share any additional information here..."
                    rows={4}
                />
                {errors.otherInformation && <p className="error-msg">{errors.otherInformation}</p>}



                {status === 'success' && (
                    <p className="success-msg">Your form has been submitted successfully!</p>
                )}
                {status === 'error' && (
                    <p className="error-msg">Something went wrong. Please try again.</p>
                )}

                <button
                    type="submit"
                    className="submit-btn"
                    disabled={status === 'submitting'}
                >
                    {status === 'submitting' ? 'Submitting...' : 'Submit'}
                </button>

            </form>
        </div>
    </div>
);

}