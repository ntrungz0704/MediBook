<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($pageTitle ?? 'MediBook - Chăm sóc sức khỏe chủ động') ?></title>
  <link rel="stylesheet" href="/assets/css/app.css">
  <link rel="stylesheet" href="/assets/css/dashboard.css">
</head>
<body>
  <?php require __DIR__ . '/header.php'; ?>

  <?php if (!empty($flashSuccess) || !empty($flashError) || !empty($flashInfo)): ?>
    <div class="container flash-container">
      <?php if (!empty($flashSuccess)): ?>
        <div class="alert alert-success"><?= htmlspecialchars($flashSuccess) ?></div>
      <?php endif; ?>
      <?php if (!empty($flashError)): ?>
        <div class="alert alert-error"><?= htmlspecialchars($flashError) ?></div>
      <?php endif; ?>
      <?php if (!empty($flashInfo)): ?>
        <div class="alert alert-info"><?= htmlspecialchars($flashInfo) ?></div>
      <?php endif; ?>
    </div>
  <?php endif; ?>

  <main>
    <?= $content ?>
  </main>

  <?php require __DIR__ . '/footer.php'; ?>

  <script src="/assets/js/app.js"></script>
  <script src="/assets/js/booking.js"></script>
  <script src="/assets/js/queue.js"></script>
</body>
</html>
