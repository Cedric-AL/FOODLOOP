package com.foodloop.controller;

import com.foodloop.model.Account;
import com.foodloop.model.AccountRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
@Transactional
public class AdminController {
    @PersistenceContext private EntityManager em;
    private final WorkspaceController workspace;
    private final AccountRepository accounts;

    public AdminController(WorkspaceController workspace, AccountRepository accounts) {
        this.workspace = workspace;
        this.accounts = accounts;
    }

    @GetMapping("/workspace")
    public Map<String, Object> workspace() {
        return Map.of(
            "users", workspace.rows("select id,email,first_name,last_name,organization_name,phone,location,role,verified,created_at from users order by created_at desc,id desc",
                new String[]{"id","email","firstName","lastName","organization","phone","location","role","verified","createdAt"}),
            "applications", workspace.rows("select a.id,a.user_id,a.organization_name,a.status,a.review_notes,a.created_at,a.reviewed_at,u.email,u.first_name,u.last_name,u.role,r.email from verification_applications a join users u on u.id=a.user_id left join users r on r.id=a.reviewed_by order by a.created_at desc,a.id desc",
                new String[]{"id","userId","organization","status","notes","createdAt","reviewedAt","email","firstName","lastName","role","reviewedBy"}),
            "donations", workspace.rows("select d.id,f.title,f.category,f.quantity,f.unit,f.expiry_date,f.date_type,f.pickup_location,f.pickup_available_from,f.pickup_available_until,f.food_condition,f.packaging_condition,f.storage_info,f.notes,f.screening_status,f.screening_notes,d.status,d.scheduled_pickup,d.completed_at,d.notes,d.created_at,u.organization_name,u.email,r.organization_name,r.email from donations d join food_items f on f.id=d.food_item_id join users u on u.id=f.donor_id left join users r on r.id=d.recipient_id order by d.created_at desc,d.id desc",
                new String[]{"id","title","category","quantity","unit","expiryDate","dateType","pickupLocation","pickupFrom","pickupUntil","foodCondition","packagingCondition","storageInfo","foodNotes","screeningStatus","screeningNotes","status","scheduledPickup","completedAt","notes","createdAt","donor","donorEmail","recipient","recipientEmail"}),
            "requests", workspace.rows("select r.id,r.donation_id,r.status,r.message,r.created_at,u.organization_name,u.email from donation_requests r join users u on u.id=r.recipient_id order by r.id desc",
                new String[]{"id","donationId","status","message","createdAt","organization","email"})
        );
    }

    public record UserUpdate(
        @NotBlank @Size(max=100) String firstName,
        @NotBlank @Size(max=100) String lastName,
        @Size(max=50) String phone,
        @Size(max=500) String location,
        @NotNull @Pattern(regexp="DONOR|RECIPIENT|ADMIN") String role,
        @NotBlank @Size(max=1000) String reason
    ) {}

    @PostMapping("/users/{id}")
    public void updateUser(Principal principal, @PathVariable long id, @Valid @RequestBody UserUpdate update) {
        // Serialize role changes so two administrators cannot remove each other's access concurrently.
        em.createNativeQuery("select id from users where role='ADMIN' order by id for update").getResultList();
        Account actor = accounts.findByEmail(principal.getName()).orElseThrow();
        if (!actor.role.equals("ADMIN")) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Account target = em.find(Account.class, id, LockModeType.PESSIMISTIC_WRITE);
        if (target == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        boolean roleChanged = !target.role.equals(update.role());
        if (roleChanged && actor.id.equals(target.id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot remove your own administrator access.");
        }
        if (roleChanged && !update.role().equals("ADMIN") && !target.role.equals("ADMIN")) {
            Number activity = (Number) em.createNativeQuery("select (select count(*) from food_items where donor_id=?1)+(select count(*) from donation_requests where recipient_id=?1)+(select count(*) from donations where recipient_id=?1)").setParameter(1,id).getSingleResult();
            if (activity.longValue() > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with donation activity cannot switch between donor and recipient roles.");
        }
        target.firstName = update.firstName().trim();
        target.lastName = update.lastName().trim();
        target.phone = update.phone();
        target.location = update.location();
        if (roleChanged) {
            target.role = update.role();
            target.verified = update.role().equals("ADMIN");
            if (!target.verified) workspace.update("update verification_applications set status='REJECTED',review_notes=?1,reviewed_by=?2,reviewed_at=now() where user_id=?3", "Role changed. Submit documents for your new role. " + update.reason(), actor.id, id);
        }
    }

    public record Reason(@NotBlank @Size(max=1000) String notes) {}

    @PostMapping("/users/{id}/revoke-verification")
    public void revokeVerification(Principal principal, @PathVariable long id, @Valid @RequestBody Reason reason) {
        Account target = em.find(Account.class,id,LockModeType.PESSIMISTIC_WRITE);
        if (target == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if (target.role.equals("ADMIN")) throw new ResponseStatusException(HttpStatus.CONFLICT,"Change the administrator's role before changing organization verification.");
        target.verified = false;
        workspace.update("update verification_applications set status='REJECTED',review_notes=?1,reviewed_by=?2,reviewed_at=now() where user_id=?3", reason.notes(), workspace.user(principal).id, id);
    }

    public record DonationUpdate(
        @NotNull @Pattern(regexp="KEEP|CANCEL|COMPLETE") String action,
        @NotNull @Pattern(regexp="SUBMITTED|UNDER_REVIEW|AVAILABLE|MATCHED|SCHEDULED_FOR_PICKUP|COMPLETED|CANCELLED") String expectedStatus,
        @NotBlank @Size(max=2000) String notes
    ) {}

    @PostMapping("/donations/{id}/record")
    public void updateRecord(@PathVariable long id, @Valid @RequestBody DonationUpdate update) {
        String status = update.expectedStatus();
        if (!update.action().equals("KEEP")) {
            if (Set.of("COMPLETED","CANCELLED").contains(status)) throw new ResponseStatusException(HttpStatus.CONFLICT,"This donation is already closed.");
            if (update.action().equals("COMPLETE") && !status.equals("SCHEDULED_FOR_PICKUP")) throw new ResponseStatusException(HttpStatus.CONFLICT,"Only a scheduled pickup can be marked completed.");
            status = update.action().equals("CANCEL") ? "CANCELLED" : "COMPLETED";
        }
        int changed = workspace.update("update donations set status=?1,notes=?2,completed_at=case when ?1='COMPLETED' then coalesce(completed_at,now()) else completed_at end where id=?3 and status=?4",status,update.notes(),id,update.expectedStatus());
        if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT,"This donation changed. Refresh before saving.");
        if (update.action().equals("CANCEL")) workspace.update("update donation_requests set status=case when status='ACCEPTED' then 'CANCELLED' else 'REJECTED' end where donation_id=?1 and status in ('PENDING','ACCEPTED')",id);
    }
}
