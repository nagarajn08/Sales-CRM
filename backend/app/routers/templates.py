from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.email_template import EmailTemplate
from app.models.user import User, UserRole
from app.schemas.template import TemplateCreate, TemplateRead, TemplateUpdate

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("/", response_model=list[TemplateRead])
def list_templates(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(EmailTemplate)
        .filter(
            EmailTemplate.organization_id == current_user.organization_id,
            (EmailTemplate.user_id == current_user.id) | (EmailTemplate.is_global == True),
        )
        .order_by(EmailTemplate.created_at.desc())
        .all()
    )


@router.post("/", response_model=TemplateRead, status_code=status.HTTP_201_CREATED)
def create_template(body: TemplateCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.is_global and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create global templates")
    t = EmailTemplate(
        organization_id=current_user.organization_id,
        user_id=None if body.is_global else current_user.id,
        name=body.name, subject=body.subject, body=body.body, is_global=body.is_global,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/{template_id}", response_model=TemplateRead)
def update_template(template_id: int, body: TemplateUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.get(EmailTemplate, template_id)
    if not t or t.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Template not found")
    if t.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return t


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.get(EmailTemplate, template_id)
    if not t or t.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Template not found")
    if t.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(t)
    db.commit()
