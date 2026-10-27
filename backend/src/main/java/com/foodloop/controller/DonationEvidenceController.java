package com.foodloop.controller;

import com.foodloop.model.*;
import com.foodloop.service.MediaFiles;
import jakarta.persistence.*;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.time.Instant;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequestMapping("/api") @Transactional
public class DonationEvidenceController {
 @PersistenceContext EntityManager em;
 private final WorkspaceController workspace;
 public DonationEvidenceController(WorkspaceController workspace){this.workspace=workspace;}

 @PostMapping(value="/donations",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
 public void submit(Principal principal,@Valid @RequestPart("details") WorkspaceController.Food food,@RequestPart MultipartFile photo) {
  Account actor=workspace.user(principal);workspace.require(actor.verified&&actor.role.equals("DONOR"));
  byte[] bytes=MediaFiles.photo(photo);
  long foodId=workspace.donate(principal,food);
  workspace.update("update food_items set photo=?1 where id=?2",bytes,foodId);
 }

 @GetMapping("/donations/{id}/photo")
 public ResponseEntity<byte[]> photo(Principal principal,@PathVariable long id){
  Account actor=workspace.user(principal);
  var files=workspace.rows("select f.photo from donations d join food_items f on f.id=d.food_item_id where d.id=?1 and (f.donor_id=?2 or d.recipient_id=?2 or ?3='ADMIN' or (d.status='AVAILABLE' and f.screening_status='PASSED' and f.expiry_date>=current_date and f.pickup_available_until>now()))",new String[]{"file"},id,actor.id,actor.role);
  if(files.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  return MediaFiles.response((byte[])files.get(0).get("file"),"donation-"+id+".jpg",false);
 }

 public record ReceiptInput(@NotNull @Pattern(regexp="ACCEPTED|REPORTED") String outcome,@Pattern(regexp="WRONG_ITEM|QUANTITY|CONDITION|OTHER") String issueType,@Size(max=2000) String notes){}
 @PostMapping(value="/donations/{id}/receipt",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
 public void receipt(Principal principal,@PathVariable long id,@Valid @RequestPart("details") ReceiptInput input,@RequestPart(required=false) MultipartFile evidence) {
  Account actor=workspace.user(principal);workspace.require(actor.role.equals("RECIPIENT"));
  var donations=workspace.rows("select recipient_id,status,handover_at from donations where id=?1 for update",new String[]{"recipient","status","handover"},id);
  if(donations.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  var donation=donations.get(0);
  workspace.require(donation.get("recipient")!=null&&((Number)donation.get("recipient")).longValue()==actor.id);
  if(!Set.of("SCHEDULED_FOR_PICKUP","COMPLETED").contains(donation.get("status")))throw new ResponseStatusException(HttpStatus.CONFLICT,"Only an assigned pickup can be confirmed or reported.");
  if(donation.get("handover")==null)throw new ResponseStatusException(HttpStatus.CONFLICT,"The donor must confirm pickup before you can confirm receipt or report the received food.");
  DonationReceipt receipt=em.find(DonationReceipt.class,id);
  if(receipt!=null&&(receipt.outcome.equals("REPORTED")||input.outcome().equals("ACCEPTED")))throw new ResponseStatusException(HttpStatus.CONFLICT,"A receipt or report has already been recorded. Refresh to see the latest record.");
  byte[] photo=null;
  if(input.outcome().equals("REPORTED")){
   if(input.issueType()==null||input.notes()==null||input.notes().isBlank())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose an issue type and explain what was different.");
   photo=MediaFiles.photo(evidence);
  }
  boolean fresh=receipt==null;
  Instant now=Instant.now();
  if(fresh){receipt=new DonationReceipt();receipt.donationId=id;receipt.recipientId=actor.id;receipt.createdAt=now;}
  receipt.outcome=input.outcome();receipt.issueType=input.outcome().equals("REPORTED")?input.issueType():null;receipt.notes=input.notes();receipt.evidencePhoto=photo;receipt.updatedAt=now;receipt.reviewStatus=input.outcome().equals("REPORTED")?"PENDING":"NOT_REQUIRED";
  if(fresh)em.persist(receipt);
  workspace.update("update donations set status='COMPLETED',completed_at=coalesce(completed_at,now()) where id=?1",id);
 }

 @GetMapping("/donations/{id}/receipt/photo")
 public ResponseEntity<byte[]> receiptPhoto(Principal principal,@PathVariable long id){
  Account actor=workspace.user(principal);
  var files=workspace.rows("select r.evidence_photo from donation_receipts r join donations d on d.id=r.donation_id join food_items f on f.id=d.food_item_id where d.id=?1 and (r.recipient_id=?2 or f.donor_id=?2 or ?3='ADMIN')",new String[]{"file"},id,actor.id,actor.role);
  if(files.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  return MediaFiles.response((byte[])files.get(0).get("file"),"receipt-"+id+".jpg",false);
 }

 public record ReportReview(@NotNull @Pattern(regexp="RESOLVED|DISMISSED") String status,@NotBlank @Size(max=2000) String notes){}
 @PostMapping("/admin/donations/{id}/receipt/review")
 public void review(Principal principal,@PathVariable long id,@Valid @RequestBody ReportReview input){
  DonationReceipt receipt=em.find(DonationReceipt.class,id,LockModeType.PESSIMISTIC_WRITE);
  if(receipt==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  if(!receipt.outcome.equals("REPORTED")||!receipt.reviewStatus.equals("PENDING"))throw new ResponseStatusException(HttpStatus.CONFLICT,"This report is no longer waiting for review.");
  receipt.reviewStatus=input.status();receipt.adminNotes=input.notes();receipt.reviewedAt=Instant.now();receipt.reviewedBy=workspace.user(principal).id;
 }
}
