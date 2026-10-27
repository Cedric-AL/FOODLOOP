package com.foodloop.controller;

import com.foodloop.model.*;
import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.time.Instant;
import java.util.*;

@RestController @RequestMapping("/api/donations/{id}/messages") @Transactional
public class ChatController {
    @PersistenceContext EntityManager em;
    private final WorkspaceController workspace;
    public ChatController(WorkspaceController workspace) { this.workspace=workspace; }
    private record Access(Account actor, boolean writable) {}

    private Access access(Principal principal,long id,boolean writing) {
        Account actor=workspace.user(principal);
        // Serialize sends against cancellation/completion and keep participants private.
        if (writing) em.createNativeQuery("select id from donations where id=?1 for update").setParameter(1,id).getResultList();
        var rows=workspace.rows("select d.status,d.recipient_id,f.pickup_available_until,d.handover_at from donations d join food_items f on f.id=d.food_item_id where d.id=?1 and (f.donor_id=?2 or d.recipient_id=?2) and d.recipient_id is not null",new String[]{"status","recipient","deadline","handover"},id,actor.id);
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Conversation not found.");
        String status=rows.get(0).get("status").toString();
        // An accepted request remains a participant record even after automatic cancellation.
        if(workspace.rows("select id from donation_requests where donation_id=?1 and recipient_id=?2 and status in ('ACCEPTED','CANCELLED')",new String[]{"id"},id,rows.get(0).get("recipient")).isEmpty())
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Chat opens after a donor accepts a request.");
        boolean active=actor.verified && status.equals("SCHEDULED_FOR_PICKUP") && !workspace.rows("select d.id from donations d join food_items f on f.id=d.food_item_id where d.id=?1 and (d.handover_at is not null or f.pickup_available_until>current_timestamp)",new String[]{"id"},id).isEmpty();
        return new Access(actor,active);
    }

    @GetMapping public Object messages(Principal p,@PathVariable long id,@RequestParam(defaultValue="0") @Min(0) long after) {
        if(after<0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Message cursor must be positive.");
        Access a=access(p,id,false);
        var messages=workspace.rows("select m.id,m.sender_id,m.body,m.created_at,u.first_name from donation_messages m join users u on u.id=m.sender_id where m.donation_id=?1 and m.id>?2 order by m.id fetch first 100 rows only",new String[]{"id","senderId","body","createdAt","sender"},id,after);
        return Map.of("messages",messages,"canSend",a.writable());
    }
    public record Message(@NotBlank @Size(max=2000) String body) {}
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Object send(Principal p,@PathVariable long id,@Valid @RequestBody Message input) {
        Access a=access(p,id,true);
        if(!a.writable()) throw new ResponseStatusException(HttpStatus.CONFLICT,"This conversation is read-only. The pickup is closed or your organization needs verification.");
        ChatMessage m=new ChatMessage();m.donationId=id;m.senderId=a.actor().id;m.body=input.body().strip();m.createdAt=Instant.now();em.persist(m);em.flush();
        return Map.of("id",m.id);
    }
}
