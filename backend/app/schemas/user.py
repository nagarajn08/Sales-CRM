from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    mobile: str | None = None
    password: str
    role: UserRole = UserRole.USER


class UserUpdate(BaseModel):
    name: str | None = None
    mobile: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = None


class UserRead(BaseModel):
    id: int
    organization_id: int | None
    email: str
    name: str
    mobile: str | None
    role: UserRole
    is_active: bool
    is_owner: bool
    is_superadmin: bool
    last_login: datetime | None
    created_at: datetime
    org_name: str | None = None
    org_type: str | None = None

    model_config = {"from_attributes": True}


class UserSummary(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole

    model_config = {"from_attributes": True}
