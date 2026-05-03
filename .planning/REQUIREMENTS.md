# Requirements: AI Appointment System (Phase 02)

## 1. Scheduling Rules
- **Business Hours:** Ability to define start/end time for each weekday.
- **Duration:** Default appointment duration (e.g., 30 or 60 minutes).
- **Buffer:** Time between appointments to avoid overlap.
- **Availability:** IA must check if a slot is occupied before confirming.

## 2. Lead Information (Mandatory Fields)
- **Full Name**
- **Email Address**
- **WhatsApp Phone**
- **Legal Area (Área Jurídica):** Selection of practice area.
- **Subject (Assunto):** Brief description of the issue.
- **Notes (Observações):** Additional context for the lawyer.

## 3. User Flows
### Visitor Flow (via AI)
1. IA qualifies the lead (interest).
2. IA asks for details (Area, Subject).
3. IA offers available slots based on `business_hours` and existing `appointments`.
4. IA confirms and creates the record.
5. Automated D+0 notification sent.

### Admin Flow
1. View all appointments in a list/calendar view.
2. Manually add/edit/cancel appointments.
3. Configure office hours.

## 4. Notifications (D-1, D-0)
- **D-1 Reminder:** Sent 24 hours before the appointment.
- **D-0 Reminder:** Sent on the day of the appointment (e.g., 2 hours before).
- Channels: WhatsApp (Evolution API) and Email.
