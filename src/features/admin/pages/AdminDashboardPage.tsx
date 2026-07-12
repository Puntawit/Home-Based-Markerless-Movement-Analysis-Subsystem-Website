import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
  type AdminCreateUserPayload,
  type AdminUpdateUserPayload,
  type AdminUserRole,
  type AdminUserStatus,
  type AdminUserSummary,
} from "@/features/admin/api/adminApi";
import { AdminSidebar } from "@/features/admin/components/AdminNavigation";
import { BackendRequestError, clearAdminBackendAuthToken, isAuthExpiredError } from "@/lib/backendApi";
import { cn } from "@/lib/cn";

type UserTab = "patient" | "doctor" | "all";
type AddUserMode = AdminUserRole;

const pageSize = 10;

const genderOptions = ["Male", "Female"];

const specialtyOptions = [
  "Physiotherapy",
  "Orthopedics",
  "Rehabilitation Medicine",
  "Sports Medicine",
  "Neurology",
  "General Practice",
];

const statusBadge: Record<AdminUserStatus, { label: string; tone: "green" | "yellow" | "slate" }> = {
  active: { label: "Active", tone: "green" },
  at_risk: { label: "At Risk", tone: "yellow" },
  inactive: { label: "Inactive", tone: "slate" },
};

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(name: string, fallback: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0] ?? fallback).slice(0, 2).toUpperCase();
}

function roleIconClass(role: AdminUserRole) {
  return role === "patient" ? "bg-blue-50 text-blue-600" : "bg-cyan-50 text-cyan-700";
}

function Topbar({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <h1 className="text-lg font-bold text-slate-900">Admin Dashboard</h1>
      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-3 sm:flex">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">AD</span>
          <span>
            <span className="block text-sm font-bold text-slate-900">Admin</span>
            <span className="block text-xs text-slate-500">Administrator</span>
          </span>
        </span>
        <button aria-label="Logout" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={onLogout} type="button">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function CountCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-sm">
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

function UserTable({
  onSelect,
  selectedId,
  users,
}: {
  onSelect: (user: AdminUserSummary) => void;
  selectedId?: string;
  users: AdminUserSummary[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[930px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
            <tr>
              <th className="px-4 py-4">Role</th>
              <th className="px-4 py-4">Name</th>
              <th className="px-4 py-4">ID</th>
              <th className="px-4 py-4">Assigned Doctor</th>
              <th className="px-4 py-4">Last Session</th>
              <th className="px-4 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => {
              const status = statusBadge[user.status];
              const selected = selectedId === user.id;
              return (
                <tr
                  className={cn("cursor-pointer transition hover:bg-cyan-50/50", selected && "bg-cyan-50")}
                  key={user.id}
                  onClick={() => onSelect(user)}
                >
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", roleIconClass(user.role))}>
                        {user.role === "patient" ? <User className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
                      </span>
                      {user.role === "patient" ? "Patient" : "Doctor"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900">{user.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{user.subtitle ?? "--"}</p>
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-700">{user.publicId ?? user.id}</td>
                  <td className="px-4 py-4 text-slate-600">{user.assignedLabel ?? "--"}</td>
                  <td className="px-4 py-4 text-slate-600">{formatDateTime(user.lastSessionAt)}</td>
                  <td className="px-4 py-4">
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value || "--"}</dd>
    </div>
  );
}

function UserDetailModal({
  deleteErrorMessage,
  deleting,
  doctors,
  onClose,
  onDelete,
  onEdit,
  user,
}: {
  deleteErrorMessage?: string;
  deleting: boolean;
  doctors: AdminUserSummary[];
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  user: AdminUserSummary;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const selectedInitials = initials(user.name, user.id);
  const assignedDoctorName = user.assignedLabel
    ? doctors.find((doctor) => doctor.id === user.assignedLabel)?.name ?? user.assignedLabel
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
              {selectedInitials}
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-950">{user.name}</h2>
              <p className="text-sm text-slate-500">
                {user.role === "patient" ? "Patient" : "Doctor"} <span className="px-1">.</span> {user.publicId ?? user.id}
              </p>
              <Badge className="mt-2" tone={statusBadge[user.status].tone}>{statusBadge[user.status].label}</Badge>
            </div>
          </div>
          <button aria-label="Close user details" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3">
          {user.role === "patient" ? (
            <>
              <ProfileField label="Age" value={user.age} />
              <ProfileField label="Gender" value={user.gender} />
              <ProfileField label="Assigned Doctor" value={assignedDoctorName} />
            </>
          ) : (
            <ProfileField label="Specialty" value={user.specialty} />
          )}
          <ProfileField label="Phone" value={user.phone} />
          <ProfileField label="Email" value={user.email} />
          <ProfileField label="Last Session" value={formatDateTime(user.lastSessionAt)} />
        </dl>

        {deleteErrorMessage ? (
          <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{deleteErrorMessage}</p>
        ) : null}

        <div className="mt-6 border-t border-slate-100 pt-4">
          {confirmingDelete ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-rose-700">Delete {user.name}? This cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setConfirmingDelete(false)} type="button" variant="outline">Cancel</Button>
                <Button className="bg-rose-600 hover:bg-rose-700" disabled={deleting} icon={<Trash2 className="h-4 w-4" />} onClick={onDelete} type="button">
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <Button className="border-rose-200 text-rose-700 hover:bg-rose-50" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmingDelete(true)} type="button" variant="outline">
                Delete User
              </Button>
              <div className="flex gap-2">
                <Button icon={<Pencil className="h-4 w-4" />} onClick={onEdit} type="button" variant="outline">
                  Edit
                </Button>
                <Button onClick={onClose} type="button">Close</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddUserModal({
  doctors,
  errorMessage,
  mode,
  onClose,
  onModeChange,
  onSubmit,
  pending,
}: {
  doctors: AdminUserSummary[];
  errorMessage?: string;
  mode: AddUserMode;
  onClose: () => void;
  onModeChange: (mode: AddUserMode) => void;
  onSubmit: (payload: AdminCreateUserPayload) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedDoctorId, setAssignedDoctorId] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      age: age ? Number(age) : null,
      assignedDoctorId: mode === "patient" ? assignedDoctorId || undefined : undefined,
      email: email || undefined,
      gender: mode === "patient" ? gender || undefined : undefined,
      name,
      phone: phone || undefined,
      role: mode,
      specialty: mode === "doctor" ? specialty || undefined : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Add User</h2>
            <p className="mt-1 text-sm text-slate-500">
              The login ID and password are generated automatically and shown once the user is created.
            </p>
          </div>
          <button aria-label="Close add user modal" className="rounded-full p-1 text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(["patient", "doctor"] as AddUserMode[]).map((item) => (
            <button
              className={cn("h-10 rounded-md text-sm font-bold", mode === item ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600")}
              key={item}
              onClick={() => onModeChange(item)}
              type="button"
            >
              {item === "patient" ? "Patient" : "Doctor"}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input className="sm:col-span-2" label="Name" name="name" onChange={(event) => setName(event.target.value)} required value={name} />
          {mode === "patient" ? (
            <>
              <Input label="Age" name="age" onChange={(event) => setAge(event.target.value)} type="number" value={age} />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Gender</span>
                <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setGender(event.target.value)} value={gender}>
                  <option value="">Select gender</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Assigned Doctor</span>
                <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setAssignedDoctorId(event.target.value)} value={assignedDoctorId}>
                  <option value="">Unassigned</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Specialty</span>
              <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setSpecialty(event.target.value)} value={specialty}>
                <option value="">Select specialty</option>
                {specialtyOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          )}
          <Input label="Phone" name="phone" onChange={(event) => setPhone(event.target.value)} value={phone} />
          <Input label="Email" name="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessage}</p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="outline">Cancel</Button>
          <Button disabled={pending} icon={<Plus className="h-4 w-4" />} type="submit">
            {pending ? "Creating..." : `Add ${mode === "patient" ? "Patient" : "Doctor"}`}
          </Button>
        </div>
      </form>
    </div>
  );
}

function EditUserModal({
  doctors,
  errorMessage,
  onClose,
  onSubmit,
  pending,
  user,
}: {
  doctors: AdminUserSummary[];
  errorMessage?: string;
  onClose: () => void;
  onSubmit: (payload: AdminUpdateUserPayload) => void;
  pending: boolean;
  user: AdminUserSummary;
}) {
  const [name, setName] = useState(user.name);
  const [specialty, setSpecialty] = useState(user.specialty ?? "");
  const [age, setAge] = useState(user.age != null ? String(user.age) : "");
  const [gender, setGender] = useState(user.gender ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [assignedDoctorId, setAssignedDoctorId] = useState(user.role === "patient" ? user.assignedLabel ?? "" : "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      age: age ? Number(age) : null,
      assignedDoctorId: user.role === "patient" ? assignedDoctorId || undefined : undefined,
      email: email || undefined,
      gender: user.role === "patient" ? gender || undefined : undefined,
      name,
      phone: phone || undefined,
      specialty: user.role === "doctor" ? specialty || undefined : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <form className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Edit {user.role === "patient" ? "Patient" : "Doctor"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Login ID ({user.publicId ?? user.id}) and password cannot be changed here.
            </p>
          </div>
          <button aria-label="Close edit user modal" className="rounded-full p-1 text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input className="sm:col-span-2" label="Name" name="name" onChange={(event) => setName(event.target.value)} required value={name} />
          {user.role === "patient" ? (
            <>
              <Input label="Age" name="age" onChange={(event) => setAge(event.target.value)} type="number" value={age} />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Gender</span>
                <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setGender(event.target.value)} value={gender}>
                  <option value="">Select gender</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Assigned Doctor</span>
                <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setAssignedDoctorId(event.target.value)} value={assignedDoctorId}>
                  <option value="">Unassigned</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Specialty</span>
              <select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" onChange={(event) => setSpecialty(event.target.value)} value={specialty}>
                <option value="">Select specialty</option>
                {specialtyOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          )}
          <Input label="Phone" name="phone" onChange={(event) => setPhone(event.target.value)} value={phone} />
          <Input label="Email" name="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{errorMessage}</p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="outline">Cancel</Button>
          <Button disabled={pending} icon={<Pencil className="h-4 w-4" />} type="submit">
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function NewCredentialsModal({
  notice,
  onClose,
}: {
  notice: { loginId: string; name: string; password: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-950">User created</h2>
        <p className="mt-1 text-sm text-slate-500">
          Share these credentials with {notice.name} through a trusted channel. The password is shown once and cannot be retrieved later. They must change it at first login.
        </p>

        <dl className="mt-5 space-y-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-xs font-medium text-slate-500">Login ID</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{notice.loginId}</dd>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <dt className="text-xs font-medium text-slate-500">Temporary password</dt>
            <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{notice.password || "(unavailable)"}</dd>
          </div>
        </dl>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} type="button">Done</Button>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<UserTab>("patient");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddUserMode>("patient");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [credentialNotice, setCredentialNotice] = useState<{ loginId: string; name: string; password: string } | null>(null);

  const usersQuery = useQuery({
    queryFn: getAdminUsers,
    queryKey: ["admin", "users"],
  });

  const users = usersQuery.data?.users ?? [];
  const selectedUser = users.find((user) => user.id === selectedUserId);

  const createUserMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setIsAddOpen(false);
      setCredentialNotice({
        loginId: created.publicId ?? created.id,
        name: created.name,
        password: created.temporaryPassword ?? "",
      });
      updateDashboardParams({ create: null });
    },
  });

  const createUserErrorMessage =
    createUserMutation.error instanceof BackendRequestError
      ? createUserMutation.error.message
      : createUserMutation.error
        ? "Could not create the user. Please try again."
        : undefined;

  const deleteUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      closeDetail();
    },
  });

  const deleteUserErrorMessage =
    deleteUserMutation.error instanceof BackendRequestError
      ? deleteUserMutation.error.message
      : deleteUserMutation.error
        ? "Could not delete the user. Please try again."
        : undefined;

  const updateUserMutation = useMutation({
    mutationFn: (payload: AdminUpdateUserPayload) => updateAdminUser(selectedUserId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setIsEditOpen(false);
    },
  });

  const updateUserErrorMessage =
    updateUserMutation.error instanceof BackendRequestError
      ? updateUserMutation.error.message
      : updateUserMutation.error
        ? "Could not save the changes. Please try again."
        : undefined;

  useEffect(() => {
    if (!isAuthExpiredError(usersQuery.error)) return;
    clearAdminBackendAuthToken();
    queryClient.removeQueries({ queryKey: ["admin"] });
    navigate("/admin/login", {
      replace: true,
      state: { message: "Your admin session expired. Please sign in again." },
    });
  }, [navigate, queryClient, usersQuery.error]);

  useEffect(() => {
    const requestedUserId = searchParams.get("user");
    if (requestedUserId && users.some((user) => user.id === requestedUserId)) {
      setSelectedUserId(requestedUserId);
      setIsDetailOpen(true);
    }
  }, [searchParams, users]);

  useEffect(() => {
    const createMode = searchParams.get("create");
    if (createMode === "patient" || createMode === "doctor") {
      setAddMode(createMode);
      setIsAddOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, query]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesTab = activeTab === "all" || user.role === activeTab;
      const matchesQuery =
        !normalized ||
        user.name.toLowerCase().includes(normalized) ||
        user.id.toLowerCase().includes(normalized) ||
        (user.publicId ?? "").toLowerCase().includes(normalized);
      return matchesTab && matchesQuery;
    });
  }, [activeTab, query, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const doctors = users.filter((user) => user.role === "doctor");

  function updateDashboardParams(updates: { create?: AddUserMode | null; user?: string | null }) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (updates.user === null) next.delete("user");
      if (updates.user) next.set("user", updates.user);
      if (updates.create === null) next.delete("create");
      if (updates.create) next.set("create", updates.create);
      return next;
    });
  }

  function openCreateUser(mode: AddUserMode) {
    setAddMode(mode);
    setIsAddOpen(true);
    createUserMutation.reset();
    updateDashboardParams({ create: mode });
  }

  function closeCreateUser() {
    setIsAddOpen(false);
    updateDashboardParams({ create: null });
  }

  function handleSelectUser(user: AdminUserSummary) {
    setSelectedUserId(user.id);
    setIsDetailOpen(true);
    deleteUserMutation.reset();
    updateDashboardParams({ user: user.id });
  }

  function closeDetail() {
    setIsDetailOpen(false);
    updateDashboardParams({ user: null });
  }

  function openEditUser() {
    updateUserMutation.reset();
    setIsEditOpen(true);
  }

  function closeEditUser() {
    setIsEditOpen(false);
  }

  function handleLogout() {
    clearAdminBackendAuthToken();
    queryClient.removeQueries({ queryKey: ["admin"] });
    navigate("/admin/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950" data-testid="admin-dashboard">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <section className="min-w-0 flex-1">
          <Topbar onLogout={handleLogout} />

          <div className="p-4 lg:p-6">
            <div className="min-w-0 space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_160px_160px]">
                <CountCard icon={<Users className="h-8 w-8" />} label="Patient Count" value={usersQuery.data?.patientCount ?? 0} />
                <CountCard icon={<Stethoscope className="h-8 w-8" />} label="Doctor Count" value={usersQuery.data?.doctorCount ?? 0} />
                <Button className="h-full min-h-16 bg-white text-cyan-700 hover:bg-cyan-50" icon={<UserPlus className="h-5 w-5" />} onClick={() => openCreateUser("patient")} variant="outline">
                  Add Patient
                </Button>
                <Button className="h-full min-h-16" icon={<UserPlus className="h-5 w-5" />} onClick={() => openCreateUser("doctor")}>
                  Add Doctor
                </Button>
              </div>

              <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="grid rounded-lg border border-slate-200 bg-slate-50 p-1 sm:grid-cols-3 lg:w-[430px]">
                  {[
                    { label: "Patients", value: "patient" as const },
                    { label: "Doctors", value: "doctor" as const },
                    { label: "All Users", value: "all" as const },
                  ].map((tab) => (
                    <button
                      className={cn("h-10 rounded-md text-sm font-bold", activeTab === tab.value ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600")}
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                  <div className="relative min-w-0 flex-1 lg:max-w-80">
                    <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search users..."
                      value={query}
                    />
                  </div>
                  <button aria-label="Refresh users" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" onClick={() => usersQuery.refetch()} type="button">
                    <RefreshCw className={cn("h-5 w-5", usersQuery.isFetching && "animate-spin")} />
                  </button>
                </div>
              </div>

              {usersQuery.isLoading ? (
                <div className="rounded-lg border border-slate-200 bg-white p-10">
                  <LoadingSpinner label="Loading admin users" />
                </div>
              ) : null}

              {usersQuery.isError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-900">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-bold">Admin users could not be loaded</p>
                      <p className="mt-1 text-sm">{usersQuery.error instanceof Error ? usersQuery.error.message : "Start the backend and try again."}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {!usersQuery.isLoading && !usersQuery.isError ? (
                <>
                  <UserTable onSelect={handleSelectUser} selectedId={isDetailOpen ? selectedUser?.id : undefined} users={pagedUsers} />
                  <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm md:flex-row md:items-center md:justify-between">
                    <p>
                      Showing {filteredUsers.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length} users
                    </p>
                    <div className="flex items-center gap-2">
                      <button aria-label="Previous page" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="flex h-9 min-w-9 items-center justify-center rounded-md bg-cyan-600 px-3 text-sm font-bold text-white">{page}</span>
                      <span className="px-1 text-slate-400">/</span>
                      <span className="font-bold text-slate-700">{totalPages}</span>
                      <button aria-label="Next page" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {isDetailOpen && selectedUser ? (
        <UserDetailModal
          deleteErrorMessage={deleteUserErrorMessage}
          deleting={deleteUserMutation.isPending}
          doctors={doctors}
          onClose={closeDetail}
          onDelete={() => deleteUserMutation.mutate(selectedUser.id)}
          onEdit={openEditUser}
          user={selectedUser}
        />
      ) : null}

      {isEditOpen && selectedUser ? (
        <EditUserModal
          doctors={doctors}
          errorMessage={updateUserErrorMessage}
          onClose={closeEditUser}
          onSubmit={(payload) => updateUserMutation.mutate(payload)}
          pending={updateUserMutation.isPending}
          user={selectedUser}
        />
      ) : null}

      {credentialNotice ? (
        <NewCredentialsModal notice={credentialNotice} onClose={() => setCredentialNotice(null)} />
      ) : null}

      {isAddOpen ? (
        <AddUserModal
          doctors={doctors}
          errorMessage={createUserErrorMessage}
          mode={addMode}
          onClose={closeCreateUser}
          onModeChange={setAddMode}
          onSubmit={(payload) => createUserMutation.mutate(payload)}
          pending={createUserMutation.isPending}
        />
      ) : null}

      {createUserMutation.isError ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 shadow-lg">
          {createUserMutation.error instanceof Error ? createUserMutation.error.message : "Could not create user."}
        </div>
      ) : null}
    </main>
  );
}
