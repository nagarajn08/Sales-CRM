from datetime import datetime
from pydantic import BaseModel


class TemplateCreate(BaseModel):
    name: str
    subject: str
    body: str
    is_global: bool = False


class TemplateUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    body: str | None = None


class TemplateRead(BaseModel):
    id: int
    name: str
    subject: str
    body: str
    is_global: bool
    user_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
