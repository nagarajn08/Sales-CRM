import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.custom_field import CustomFieldDef, FieldType
from app.models.user import User

router = APIRouter(prefix="/api/custom-fields", tags=["custom-fields"])


class FieldDefCreate(BaseModel):
    name: str
    label: str
    field_type: FieldType = FieldType.TEXT
    options: list[str] | None = None   # for dropdown
    required: bool = False
    order: int = 0


class FieldDefUpdate(BaseModel):
    label: str | None = None
    options: list[str] | None = None
    required: bool | None = None
    order: int | None = None
    is_active: bool | None = None


class FieldDefRead(BaseModel):
    id: int
    name: str
    label: str
    field_type: FieldType
    options: list[str] | None
    required: bool
    order: int
    is_active: bool

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_obj(cls, obj: CustomFieldDef) -> "FieldDefRead":
        opts = None
        if obj.options:
            try:
                opts = json.loads(obj.options)
            except Exception:
                opts = []
        return cls(
            id=obj.id, name=obj.name, label=obj.label,
            field_type=obj.field_type, options=opts,
            required=obj.required, order=obj.order, is_active=obj.is_active,
        )


@router.get("/", response_model=list[FieldDefRead])
def list_fields(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fields = db.query(CustomFieldDef).filter(
        CustomFieldDef.organization_id == current_user.organization_id,
        CustomFieldDef.is_active == True,
    ).order_by(CustomFieldDef.order, CustomFieldDef.id).all()
    return [FieldDefRead.from_orm_obj(f) for f in fields]


@router.post("/", response_model=FieldDefRead, status_code=201)
def create_field(body: FieldDefCreate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    # Validate name: lowercase alphanumeric + underscore only
    clean = body.name.lower().strip().replace(" ", "_")
    if not clean.replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="Field name must be alphanumeric with underscores only")

    # Ensure unique name within org
    existing = db.query(CustomFieldDef).filter(
        CustomFieldDef.organization_id == admin.organization_id,
        CustomFieldDef.name == clean,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Field '{clean}' already exists")

    options_json = json.dumps(body.options) if body.options else None
    field = CustomFieldDef(
        organization_id=admin.organization_id,
        name=clean,
        label=body.label,
        field_type=body.field_type,
        options=options_json,
        required=body.required,
        order=body.order,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return FieldDefRead.from_orm_obj(field)


@router.put("/{field_id}", response_model=FieldDefRead)
def update_field(field_id: int, body: FieldDefUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    field = db.get(CustomFieldDef, field_id)
    if not field or field.organization_id != admin.organization_id:
        raise HTTPException(status_code=404, detail="Field not found")
    if body.label is not None:
        field.label = body.label
    if body.options is not None:
        field.options = json.dumps(body.options)
    if body.required is not None:
        field.required = body.required
    if body.order is not None:
        field.order = body.order
    if body.is_active is not None:
        field.is_active = body.is_active
    db.commit()
    db.refresh(field)
    return FieldDefRead.from_orm_obj(field)


@router.delete("/{field_id}", status_code=204)
def delete_field(field_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    field = db.get(CustomFieldDef, field_id)
    if not field or field.organization_id != admin.organization_id:
        raise HTTPException(status_code=404, detail="Field not found")
    db.delete(field)
    db.commit()
