"""
AI services for JobMate AI.
Provides match scoring and cover letter generation using OpenAI GPT.
"""
from typing import List, Tuple
from openai import OpenAI
from app.config import settings
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re


# Initialize OpenAI client
client = OpenAI(api_key=settings.openai_api_key)


def calculate_match_score(
    user_skills: List[str],
    target_role: str,
    job_title: str,
    job_description: str
) -> Tuple[float, List[str], List[str]]:
    """
    Calculate a match score between user profile and job posting.
    
    Uses a hybrid approach:
    1. Exact keyword matching for skills
    2. TF-IDF cosine similarity for semantic matching
    
    Args:
        user_skills: List of user's skills
        target_role: User's target job role
        job_title: Job posting title
        job_description: Job posting description
    
    Returns:
        Tuple of (match_score, matched_skills, missing_skills)
        - match_score: 0-100 score
        - matched_skills: Skills found in job description
        - missing_skills: Skills not found
    """
    if not user_skills:
        return 0.0, [], []
    
    # Normalize job text
    job_text = f"{job_title} {job_description}".lower()
    
    # 1. Exact skill matching (50% weight)
    matched_skills = []
    for skill in user_skills:
        # Check for whole word match
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, job_text):
            matched_skills.append(skill)
    
    missing_skills = [s for s in user_skills if s not in matched_skills]
    skill_match_ratio = len(matched_skills) / len(user_skills) if user_skills else 0
    
    # 2. Semantic matching using TF-IDF (50% weight)
    try:
        user_profile_text = f"{target_role} {' '.join(user_skills)}"
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform([user_profile_text, job_text])
        semantic_similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    except:
        # Fallback if TF-IDF fails (e.g., too few words)
        semantic_similarity = 0.0
    
    # Combine scores (50% exact match, 50% semantic)
    final_score = (skill_match_ratio * 0.5 + semantic_similarity * 0.5) * 100
    
    # Cap at 100
    final_score = min(100.0, final_score)
    
    return round(final_score, 2), matched_skills, missing_skills


async def generate_cover_letter(
    user_name: str,
    user_skills: List[str],
    target_role: str,
    job_title: str,
    company: str,
    job_description: str
) -> str:
    """
    Generate a tailored cover letter using OpenAI GPT.
    
    Args:
        user_name: User's full name
        user_skills: List of user's skills
        target_role: User's target job role
        job_title: Job posting title
        company: Company name
        job_description: Job posting description
    
    Returns:
        Generated cover letter as a string
    """
    skills_str = ", ".join(user_skills) if user_skills else "various technical skills"
    
    prompt = f"""Write a professional cover letter for the following job application:

Job Title: {job_title}
Company: {company}
Job Description: {job_description[:1000]}...  

Applicant Profile:
- Name: {user_name}
- Target Role: {target_role}
- Key Skills: {skills_str}

Requirements:
1. Keep it concise (250-300 words)
2. Highlight relevant skills that match the job description
3. Show enthusiasm for the company and role
4. Use a professional but warm tone
5. Include a strong opening and closing
6. Do NOT use placeholder text like [Your Name] - use the actual name provided
7. Format as a proper business letter

Generate the cover letter:"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using the cost-effective model
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert career coach and professional writer specializing in cover letters. Write compelling, authentic cover letters that showcase candidates' strengths."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=600
        )
        
        cover_letter = response.choices[0].message.content.strip()
        return cover_letter
        
    except Exception as e:
        # Fallback if OpenAI API fails
        return f"""Dear Hiring Manager,

I am writing to express my strong interest in the {job_title} position at {company}. With my background in {target_role} and expertise in {skills_str}, I am confident in my ability to contribute to your team.

My experience aligns well with the requirements outlined in your job posting. I am particularly excited about the opportunity to work at {company} and apply my skills to drive meaningful impact.

I would welcome the opportunity to discuss how my background and skills would benefit your team. Thank you for considering my application.

Best regards,
{user_name}

Note: This is a fallback cover letter. For a more tailored letter, please ensure the OpenAI API key is configured correctly.
Error: {str(e)}"""


async def generate_cover_letter_simple(
    user_name: str,
    user_skills: List[str],
    target_role: str,
    job_title: str,
    company: str
) -> str:
    """
    Generate a simple cover letter without requiring the full job description.
    Useful for testing or when job description is not available.
    """
    skills_str = ", ".join(user_skills[:5]) if user_skills else "various technical skills"
    
    return f"""Dear Hiring Manager,

I am writing to express my interest in the {job_title} position at {company}. As a {target_role} with expertise in {skills_str}, I am excited about the opportunity to contribute to your team.

My background has equipped me with strong technical and problem-solving skills that align well with this role. I am particularly drawn to {company}'s mission and would love to bring my experience to help drive your goals forward.

I would welcome the opportunity to discuss how my skills and experience can benefit your team. Thank you for considering my application.

Best regards,
{user_name}"""


async def generate_interview_questions(
    job_title: str,
    company: str,
    job_description: str,
    user_skills: List[str]
) -> dict:
    """
    Generate AI-powered interview preparation questions.
    
    Returns a structured set of:
    - Behavioral questions (STAR method)
    - Technical questions based on job requirements
    - Company-specific questions
    
    Args:
        job_title: Job posting title
        company: Company name
        job_description: Full job description
        user_skills: User's skills for context
    
    Returns:
        Dict with categorized questions
    """
    skills_str = ", ".join(user_skills[:10]) if user_skills else "general technical skills"
    
    prompt = f"""Generate comprehensive interview preparation questions for this job:

Job Title: {job_title}
Company: {company}
Job Description: {job_description[:1500]}...
Candidate Skills: {skills_str}

Generate the following types of questions (return as JSON):

1. Behavioral Questions (5 questions):
   - Leadership and teamwork scenarios
   - Problem-solving situations
   - Conflict resolution
   - Use STAR method framework

2. Technical Questions (5 questions):
   - Based on the job requirements
   - Specific to the technologies/skills mentioned
   - Mix of conceptual and practical questions

3. Company-Specific Questions (3 questions):
   - About the role and team
   - Growth opportunities
   - Company culture and values

Format as JSON with this structure:
{{
  "behavioral": ["question 1", "question 2", ...],
  "technical": ["question 1", "question 2", ...],
  "company_specific": ["question 1", "question 2", ...]
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert interview coach who helps candidates prepare for technical interviews. Generate relevant, realistic questions that interviewers actually ask."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        
        import json
        questions = json.loads(response.choices[0].message.content)
        return questions
        
    except Exception as e:
        # Fallback questions if API fails
        return {
            "behavioral": [
                "Tell me about a time when you faced a challenging problem at work. How did you approach it?",
                "Describe a situation where you had to work with a difficult team member. How did you handle it?",
                "Give an example of when you had to meet a tight deadline. What was your strategy?",
                "Tell me about a time you failed. What did you learn from it?",
                "Describe a project you're particularly proud of and your role in it."
            ],
            "technical": [
                f"What experience do you have with the key technologies required for this {job_title} role?",
                "How would you approach debugging a production issue?",
                "Explain your process for code review and ensuring code quality.",
                "What testing strategies do you typically employ?",
                "How do you stay updated with new technologies and industry trends?"
            ],
            "company_specific": [
                f"Why are you interested in working at {company}?",
                f"What do you know about {company}'s products/services?",
                "Where do you see yourself growing in this role over the next year?"
            ],
            "error": str(e)
        }


async def estimate_salary(
    job_title: str,
    location: str,
    experience_years: int = None,
    skills: List[str] = None,
    company_size: str = None
) -> dict:
    """
    Estimate salary range using AI based on job details.
    
    Args:
        job_title: Job title
        location: Job location
        experience_years: Years of experience (optional)
        skills: List of relevant skills (optional)
        company_size: Company size (startup, small, medium, large) (optional)
    
    Returns:
        Dict with salary range and insights
    """
    skills_str = ", ".join(skills[:10]) if skills else "general technical skills"
    exp_str = f"{experience_years} years" if experience_years else "mid-level"
    
    prompt = f"""Estimate the salary range for this job position:

Job Title: {job_title}
Location: {location}
Experience: {exp_str}
Key Skills: {skills_str}
Company Size: {company_size or 'medium-sized company'}

Provide a realistic salary estimation in USD (annual). Consider:
1. Current market rates for this role
2. Location cost of living
3. Experience level
4. In-demand skills premium
5. Company size impact

Return your response as JSON with this structure:
{{
  "currency": "USD",
  "min_salary": <number>,
  "max_salary": <number>,
  "median_salary": <number>,
  "insights": [
    "Insight 1 about the salary range",
    "Insight 2 about market conditions",
    "Insight 3 about growth potential"
  ],
  "factors": {{
    "location_impact": "High cost of living area adds 20-30%",
    "skills_premium": "High demand skills like X add 10-15%",
    "experience_factor": "Senior level adds 40-50%"
  }}
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a compensation analysis expert with deep knowledge of tech industry salaries, market trends, and geographic pay differences. Provide realistic, data-driven salary estimates."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,  # Lower temperature for more consistent estimates
            max_tokens=800,
            response_format={"type": "json_object"}
        )
        
        import json
        salary_data = json.loads(response.choices[0].message.content)
        return salary_data
        
    except Exception as e:
        # Fallback salary estimation
        base_salary = 70000
        
        # Adjust for experience
        if experience_years:
            if experience_years < 2:
                base_salary = 60000
            elif experience_years < 5:
                base_salary = 80000
            elif experience_years < 10:
                base_salary = 110000
            else:
                base_salary = 140000
        
        # Simple location adjustment
        location_lower = location.lower() if location else ""
        if any(city in location_lower for city in ["san francisco", "new york", "seattle"]):
            base_salary = int(base_salary * 1.4)
        elif any(city in location_lower for city in ["austin", "boston", "chicago"]):
            base_salary = int(base_salary * 1.2)
        
        return {
            "currency": "USD",
            "min_salary": int(base_salary * 0.8),
            "max_salary": int(base_salary * 1.3),
            "median_salary": base_salary,
            "insights": [
                f"Estimated based on {job_title} market rates",
                "Salary varies by company and negotiation",
                "Consider total compensation including benefits"
            ],
            "factors": {
                "location_impact": "Adjusted for location cost of living",
                "skills_premium": "Based on technical skill requirements",
                "experience_factor": f"Adjusted for {exp_str} experience"
            },
            "error": str(e),
            "fallback": True
        }


