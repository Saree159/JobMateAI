"""Update user password in the database."""
from app.database import engine
from app.models import User
from sqlalchemy.orm import Session
import bcrypt

# Get the first user (or specify email)
session = Session(engine)
user = session.query(User).first()

if user:
    print(f'Updating password for user: {user.email}')
    
    # Hash the new password
    password = 'Soul1412'
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # Update the user
    user.password_hash = hashed.decode('utf-8')
    session.commit()
    
    print(f'✓ Password updated successfully for {user.email}')
    print(f'  New password: {password}')
else:
    print('No users found in database')

session.close()
