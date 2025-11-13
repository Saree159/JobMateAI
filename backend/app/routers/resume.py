from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
import PyPDF2
import docx
import io
import re

from ..database import get_db
from ..models import User
from .users import get_current_user

router = APIRouter(prefix="/api/resume", tags=["resume"])


def extract_text_from_resume(file_content: bytes, filename: str) -> str:
    """
    Extract text from resume file (PDF or DOCX)
    Returns: extracted text as string
    """
    try:
        if filename.endswith('.pdf'):
            # Parse PDF
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        
        elif filename.endswith('.docx'):
            # Parse DOCX
            doc_file = io.BytesIO(file_content)
            doc = docx.Document(doc_file)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            # Also extract text from tables
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        text += cell.text + " "
                    text += "\n"
            return text
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")


def parse_resume_text(text: str) -> Dict[str, any]:
    """
    Parse resume text and extract relevant information
    Returns: dict with extracted fields
    """
    try:
        # Initialize result
        result = {
            "full_name": None,
            "target_role": None,
            "skills": [],
            "location_preference": None,
        }
        
        # Extract name (usually in first few lines, capitalized)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            # First line is often the name
            potential_name = lines[0]
            if len(potential_name.split()) <= 4 and potential_name[0].isupper():
                result["full_name"] = potential_name
        
        # Extract email (for validation)
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        
        # Extract job titles (common patterns)
        title_keywords = [
            "Software Engineer", "Developer", "Data Scientist", "Product Manager",
            "Designer", "Analyst", "Marketing", "Sales", "Manager", "Director",
            "Frontend", "Backend", "Full Stack", "DevOps", "ML Engineer",
            "UX Designer", "UI Designer", "Project Manager", "QA Engineer"
        ]
        
        text_lower = text.lower()
        for keyword in title_keywords:
            if keyword.lower() in text_lower:
                result["target_role"] = keyword
                break
        
        # Extract skills (common tech skills)
        skill_patterns = [
            # Programming languages
            r'\b(Python|JavaScript|Java|C\+\+|C#|Ruby|PHP|Swift|Kotlin|Go|Rust|TypeScript)\b',
            # Frameworks/Libraries
            r'\b(React|Angular|Vue|Node\.?js|Django|Flask|Spring|\.NET|Laravel|Rails)\b',
            # Databases
            r'\b(SQL|MySQL|PostgreSQL|MongoDB|Redis|Oracle|SQLite)\b',
            # Cloud/DevOps
            r'\b(AWS|Azure|GCP|Docker|Kubernetes|Jenkins|Git|CI/CD)\b',
            # Other tech
            r'\b(HTML|CSS|REST|GraphQL|API|Agile|Scrum|Machine Learning|AI|Data Analysis)\b',
        ]
        
        skills_set = set()
        for pattern in skill_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                # Normalize skill name
                skill = match.strip()
                if skill:
                    skills_set.add(skill)
        
        result["skills"] = list(skills_set)[:20]  # Limit to 20 skills
        
        # Extract location (cities/states pattern)
        location_pattern = r'\b(New York|San Francisco|Los Angeles|Chicago|Boston|Seattle|Austin|Denver|Remote|USA|United States)\b'
        locations = re.findall(location_pattern, text, re.IGNORECASE)
        if locations:
            result["location_preference"] = locations[0]
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse resume: {str(e)}")


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and parse resume (PDF or DOCX), return extracted information
    """
    # Validate file type
    if not (file.filename.endswith('.pdf') or file.filename.endswith('.docx')):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    # Validate file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    # Extract text from file
    text = extract_text_from_resume(content, file.filename)
    
    # Parse resume text
    parsed_data = parse_resume_text(text)
    
    # Update user profile with parsed data (if fields are empty)
    user = db.query(User).filter(User.id == current_user.id).first()
    
    updated_fields = []
    
    if parsed_data["full_name"] and not user.full_name:
        user.full_name = parsed_data["full_name"]
        updated_fields.append("full_name")
    
    if parsed_data["target_role"] and not user.target_role:
        user.target_role = parsed_data["target_role"]
        updated_fields.append("target_role")
    
    if parsed_data["skills"] and not user.skills:
        user.skills = parsed_data["skills"]
        updated_fields.append("skills")
    
    if parsed_data["location_preference"] and not user.location_preference:
        user.location_preference = parsed_data["location_preference"]
        updated_fields.append("location_preference")
    
    if updated_fields:
        db.commit()
        db.refresh(user)
    
    return {
        "message": "Resume parsed successfully",
        "parsed_data": parsed_data,
        "updated_fields": updated_fields,
        "user": {
            "full_name": user.full_name,
            "target_role": user.target_role,
            "skills": user.skills,
            "location_preference": user.location_preference,
        }
    }
