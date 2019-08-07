import { ABP } from '@abp/ng.core';
import { ConfirmationService, Toaster } from '@abp/ng.theme.shared';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { debounceTime, finalize, pluck } from 'rxjs/operators';
import {
  IdentityAddRole,
  IdentityDeleteRole,
  IdentityGetRoleById,
  IdentityGetRoles,
  IdentityUpdateRole,
} from '../../actions/identity.actions';
import { Identity } from '../../models/identity';
import { IdentityState } from '../../states/identity.state';

@Component({
  selector: 'abp-roles',
  templateUrl: './roles.component.html',
})
export class RolesComponent {
  @Select(IdentityState.getRoles)
  data$: Observable<Identity.RoleItem[]>;

  @Select(IdentityState.getRolesTotalCount)
  totalCount$: Observable<number>;

  form: FormGroup;

  selected: Identity.RoleItem;

  isModalVisible: boolean;

  visiblePermissions: boolean = false;

  providerKey: string;

  pageQuery: ABP.PageQueryParams = {
    sorting: 'name',
  };

  loading: boolean = false;

  @ViewChild('modalContent', { static: false })
  modalContent: TemplateRef<any>;

  constructor(private confirmationService: ConfirmationService, private fb: FormBuilder, private store: Store) {}

  onSearch(value) {
    this.pageQuery.filter = value;
    this.get();
  }

  createForm() {
    this.form = this.fb.group({
      name: [this.selected.name || '', [Validators.required, Validators.maxLength(256)]],
      isDefault: [this.selected.isDefault || false],
      isPublic: [this.selected.isPublic || false],
    });
  }

  openModal() {
    this.createForm();
    this.isModalVisible = true;
  }

  onAdd() {
    this.selected = {} as Identity.RoleItem;
    this.openModal();
  }

  onEdit(id: string) {
    this.store
      .dispatch(new IdentityGetRoleById(id))
      .pipe(pluck('IdentityState', 'selectedRole'))
      .subscribe(selectedRole => {
        this.selected = selectedRole;
        this.openModal();
      });
  }

  save() {
    if (!this.form.valid) return;

    this.store
      .dispatch(
        this.selected.id
          ? new IdentityUpdateRole({ ...this.form.value, id: this.selected.id })
          : new IdentityAddRole(this.form.value),
      )
      .subscribe(() => {
        this.isModalVisible = false;
      });
  }

  delete(id: string, name: string) {
    this.confirmationService
      .warn('AbpIdentity::RoleDeletionConfirmationMessage', 'AbpIdentity::AreYouSure', {
        messageLocalizationParams: [name],
      })
      .subscribe((status: Toaster.Status) => {
        if (status === Toaster.Status.confirm) {
          this.store.dispatch(new IdentityDeleteRole(id));
        }
      });
  }

  onPageChange(data) {
    this.pageQuery.skipCount = data.first;
    this.pageQuery.maxResultCount = data.rows;

    this.get();
  }

  get() {
    this.loading = true;
    this.store
      .dispatch(new IdentityGetRoles(this.pageQuery))
      .pipe(finalize(() => (this.loading = false)))
      .subscribe();
  }
}