# Restrict access to announcements and age factors

## Scope
Fix only the two selected findings affecting Announcements and Age Factors. Leave all other security findings, client access, signup behavior, and role assignment unchanged.

## Access changes requiring approval
- Preserve access for existing team accounts when the change is applied.
- New Sales accounts cannot read announcements or age factors until an administrator approves access.
- Administrators and Managers retain access through their administrator-assigned roles.
- Add an “Acesso a comunicados e fatores” approval control to the existing Equipe screen, available only to administrators.
- This approval affects only these two features, including the age-factor list used in client forms; it does not approve or restrict access to the rest of the CRM.

## Technical implementation
- Create an RLS-protected approval table with explicit grants. Only administrators can grant or revoke approval; users can read their own approval.
- Backfill approval for existing role-bearing accounts as part of this additive schema change. Do not automatically approve future signups.
- Replace only the two unrestricted SELECT policies with predicates requiring an approval record or an administrator/manager role. Preserve existing write policies.
- Apply the migration through Lovable Cloud and verify the live policy definitions and allowed/denied read scenarios.
- Record the access rule in AGENTS.md, commit the changes, and mark only the two selected findings as fixed after verification.

## Validation
Check that existing team members retain access, a new unapproved Sales account cannot read either feature or approve itself, and an administrator can grant and revoke access. Re-check the selected findings without changing any other finding statuses.