<?php
$conn = mysqli_connect("spryrr1myu6oalwl.chr7pe7iynqr.eu-west-1.rds.amazonaws.com","y21blfp42bybvehd","klclvqvgzdqq368i","ifjq14krys29jh90",3306);
// $conn = mysqli_connect("sci-mysql","coa123wuser","grt64dkh!@2FD","coa123wdb");
if(!$conn) die("Connection failed: ". mysqli_connect_error());

function validate($data) {
  $data = htmlspecialchars($data);
  $data = trim($data);
  $data = stripslashes($data);
  return $data;
}

$checkin =  validate($_GET['checkin']);
$checkout = validate($_GET['checkout']);
$partySize = validate($_GET['partySize']);
$cateringGrade = validate($_GET['cateringGrade']);

$dateRange = (new DateTime($checkin))->diff(new DateTime($checkout))->days;
$dateRange = (string)((int)$dateRange+1);

$sql = "SELECT 
name, weekend_price, weekday_price, capacity, popularity, popularity_rank, 
catering.cost AS catering_price , 
IF(venue.licensed, 'Yes', 'No') AS licensed, IF(available_days=0,0,
IF(available_days IS NULL, $dateRange,
     available_days
    )
) as available_days
FROM venue
LEFT JOIN catering ON venue.venue_id=catering.venue_id
LEFT JOIN (
SELECT a.venue_id, a.pop AS popularity, COUNT(*) AS popularity_rank 
FROM (SELECT venue_id, count(booking_date) AS pop 
     FROM venue_booking 
     GROUP BY venue_id) a 
JOIN (SELECT venue_id, COUNT(booking_date) AS pop 
      FROM venue_booking 
     GROUP BY venue_id) b ON a.pop<b.pop 
GROUP BY a.venue_id 
) pr ON catering.venue_id=pr.venue_id 
LEFT JOIN (
SELECT ($dateRange-COUNT(booking_date)) AS available_days, venue_id 
FROM venue_booking
WHERE booking_date between '$checkin' and '$checkout'
GROUP BY venue_id
) avail ON avail.venue_id=pr.venue_id
WHERE venue.capacity >= $partySize AND grade=$cateringGrade
GROUP BY name, capacity, licensed, catering_price, venue.venue_id;";

$result = mysqli_query($conn,$sql);
$data = mysqli_fetch_all($result,MYSQLI_ASSOC);

mysqli_free_result($result);
mysqli_close($conn);

echo json_encode($data);

?>