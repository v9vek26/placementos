"use client";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/workspace";
import { Empty, Heading, Notice, State, useResource } from "@/components/ui";
import { errorMessage, write } from "@/lib/api";
import { roles, type User } from "@/lib/types";
export default function UsersPage() {
  const user = useSession();
  const resource = useResource<User[]>("/users");
  const [search, setSearch] = useState("");
  const users = resource.data?.filter((u) =>
    `${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        title="User management"
        description="Manage access for your campus community."
      >
        <Link className="button secondary" href="/admin/recruiters">
          Onboard recruiters →
        </Link>
      </Heading>
      <p>
        New users create an account on the sign-in page. To onboard a recruiter,
        assign the Recruiter role here, then create their recruiter profile.
      </p>
      <div className="toolbar">
        <input
          aria-label="Search users"
          placeholder="Search email or role"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <State {...resource} retry={resource.reload} />
      {users?.length === 0 && <Empty>No matching users.</Empty>}
      {users && users.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  self={u.id === user.userId}
                  onSaved={(saved) =>
                    resource.setData(
                      (items) =>
                        items?.map((item) =>
                          item.id === saved.id ? saved : item,
                        ) || [],
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
function UserRow({
  user,
  self,
  onSaved,
}: {
  user: User;
  self: boolean;
  onSaved: (user: User) => void;
}) {
  const [role, setRole] = useState(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function save() {
    if (
      !window.confirm(
        `Change ${user.email} from ${user.role} to ${role}? Their access changes immediately.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      onSaved(await write<User>(`/users/${user.id}`, "PATCH", { role }));
      setSuccess("Role updated.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <tr>
      <td>
        {user.email}
        {self && <small> (you)</small>}
      </td>
      <td>
        <select
          aria-label={`Role for ${user.email}`}
          value={role}
          disabled={self || busy}
          onChange={(e) => setRole(e.target.value as User["role"])}
        >
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </td>
      <td>
        {self ? (
          <small>Your own role is protected in this workspace.</small>
        ) : (
          <button
            disabled={busy || role === user.role}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : "Save role"}
          </button>
        )}
        <Notice error={error} success={success} />
      </td>
    </tr>
  );
}
