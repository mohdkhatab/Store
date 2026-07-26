<?php
// ==============================================
// COMPLETE INSTALLATION SCRIPT - FIXED
// ==============================================
// Foreign key constraints ko handle karega
// ==============================================

// Database configuration
$host = 'localhost';
$dbname = 'expl208498_rex';
$username = 'expl208498_rex';
$password = 'expl208498_rex';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // DISABLE FOREIGN KEY CHECKS (Important!)
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    echo "✅ Foreign key checks disabled\n\n";
    
    echo "✅ Connected to database: $dbname\n\n";
    
    // ==============================================
    // 1. DROP ALL EXISTING TABLES (Safe order)
    // ==============================================
    $tables = ['comment_reactions', 'comments', 'episode_views', 'episode_likes', 
               'subscribers', 'admin_sessions', 'admin_login_history', 'password_resets', 
               'episodes', 'anime', 'admin'];
    
    foreach ($tables as $table) {
        try {
            $pdo->exec("DROP TABLE IF EXISTS `$table`");
            echo "🗑️  Dropped table: $table\n";
        } catch (PDOException $e) {
            echo "⚠️  Could not drop $table: " . $e->getMessage() . "\n";
        }
    }
    echo "\n";
    
    // ==============================================
    // 2. CREATE ADMIN TABLE (Parent table - drop last, create first)
    // ==============================================
    $pdo->exec("CREATE TABLE IF NOT EXISTS `admin` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `username` VARCHAR(100) NOT NULL,
        `email` VARCHAR(255) NOT NULL,
        `password` VARCHAR(255) NOT NULL,
        `recovery_email` VARCHAR(255) DEFAULT NULL,
        `phone` VARCHAR(20) DEFAULT NULL,
        `two_factor_enabled` TINYINT(1) DEFAULT 0,
        `two_factor_secret` VARCHAR(255) DEFAULT NULL,
        `remember_token` VARCHAR(255) DEFAULT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `email` (`email`),
        UNIQUE KEY `username` (`username`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ Table 'admin' created\n";
    
    // ==============================================
    // 3. CREATE ANIME TABLE
    // ==============================================
    $pdo->exec("CREATE TABLE IF NOT EXISTS `anime` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `title` VARCHAR(255) NOT NULL,
        `slug` VARCHAR(255) NOT NULL,
        `description` TEXT NOT NULL,
        `poster_image` VARCHAR(500) NOT NULL,
        `banner_image` VARCHAR(500) NOT NULL,
        `genre` VARCHAR(100) DEFAULT NULL,
        `episode_count` INT(11) DEFAULT 0,
        `rating` VARCHAR(10) DEFAULT '9.0',
        `is_featured` TINYINT(1) DEFAULT 0,
        `type` ENUM('anime','donghua','movie') DEFAULT 'donghua',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `slug` (`slug`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ Table 'anime' created\n";
    
    // ==============================================
    // 4. CREATE EPISODES TABLE
    // ==============================================
    $pdo->exec("CREATE TABLE IF NOT EXISTS `episodes` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `anime_id` INT(11) NOT NULL,
        `episode_number` INT(11) NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `server1_url` VARCHAR(500) DEFAULT NULL,
        `server2_url` VARCHAR(500) DEFAULT NULL,
        `duration` VARCHAR(20) DEFAULT '24 mins',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `anime_id` (`anime_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ Table 'episodes' created\n";
    
    // ==============================================
    // 5. CREATE COMMENTS TABLE
    // ==============================================
    $pdo->exec("CREATE TABLE IF NOT EXISTS `comments` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `episode_id` INT(11) NOT NULL,
        `parent_id` INT(11) DEFAULT NULL,
        `user_name` VARCHAR(100) DEFAULT 'Anonymous',
        `comment` TEXT NOT NULL,
        `likes` INT(11) DEFAULT 0,
        `reaction_count` JSON DEFAULT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `episode_id` (`episode_id`),
        KEY `parent_id` (`parent_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ Table 'comments' created\n";
    
    // ==============================================
    // 6. CREATE EPISODE LIKES TABLE
    // ==============================================
    $pdo->exec("CREATE TABLE IF NOT EXISTS `episode_likes` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `episode_id` INT(11) NOT NULL,
        `user_ip` VARCHAR(45) NOT NULL,
        `type` ENUM('like','dislike') NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `unique_like` (`episode_id`,`user_ip`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ Table 'episode_likes' created\n";
    
    // ==============================================
    // 7. CREATE EPISODE VIEWS TABLE
    // ==============================================
    $pdo->exec("CREATE TABLE IF NOT EXISTS `episode_views` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `episode_id` INT(11) NOT NULL,
        `user_ip` VARCHAR(45) NOT NULL,
        `viewed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `episode_id` (`episode_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ Table 'episode_views' created\n";
    
    // ==============================================
    // 8. CREATE COMMENT REACTIONS TABLE
    // ==============================================
    $pdo->exec("CREATE TABLE IF NOT EXISTS `comment_reactions` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `comment_id` INT(11) NOT NULL,
        `user_ip` VARCHAR(45) NOT NULL,
        `reaction_type` ENUM('like','heart','laugh','sad','angry') DEFAULT 'like',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `comment_user` (`comment_id`,`user_ip`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ Table 'comment_reactions' created\n";
    
    // ==============================================
    // 9. CREATE SUBSCRIBERS TABLE
    // ==============================================
    $pdo->exec("CREATE TABLE IF NOT EXISTS `subscribers` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `user_ip` VARCHAR(45) NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `user_ip` (`user_ip`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ Table 'subscribers' created\n";
    
    // ==============================================
    // 10. CREATE ADMIN SESSIONS TABLE
    // ==============================================
    $pdo->exec("CREATE TABLE IF NOT EXISTS `admin_sessions` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `admin_id` INT(11) NOT NULL,
        `session_token` VARCHAR(255) NOT NULL,
        `ip_address` VARCHAR(45) NOT NULL,
        `user_agent` TEXT,
        `last_activity` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `is_active` TINYINT(1) DEFAULT 1,
        PRIMARY KEY (`id`),
        KEY `admin_id` (`admin_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ Table 'admin_sessions' created\n";
    
    // ==============================================
    // 11. CREATE ADMIN LOGIN HISTORY TABLE
    // ==============================================
    $pdo->exec("CREATE TABLE IF NOT EXISTS `admin_login_history` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `admin_id` INT(11) NOT NULL,
        `ip_address` VARCHAR(45) NOT NULL,
        `user_agent` TEXT,
        `status` ENUM('success','failed') DEFAULT 'success',
        `login_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `admin_id` (`admin_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ Table 'admin_login_history' created\n";
    
    // ==============================================
    // 12. CREATE PASSWORD RESETS TABLE
    // ==============================================
    $pdo->exec("CREATE TABLE IF NOT EXISTS `password_resets` (
        `id` INT(11) NOT NULL AUTO_INCREMENT,
        `email` VARCHAR(255) NOT NULL,
        `token` VARCHAR(255) NOT NULL,
        `expires_at` TIMESTAMP NOT NULL,
        `used` TINYINT(1) DEFAULT 0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `token` (`token`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ Table 'password_resets' created\n";
    
    echo "\n=============================================\n";
    echo "ALL TABLES CREATED SUCCESSFULLY!\n";
    echo "=============================================\n\n";
    
    // ==============================================
    // 13. INSERT ADMIN USER
    // ==============================================
    $admin_email = 'explaineraliwebsite@gmail.com';
    $admin_username = 'admin';
    $admin_password = 'Explainerali555';
    $hashed_password = password_hash($admin_password, PASSWORD_DEFAULT);
    
    // Check if admin already exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM admin WHERE email = ?");
    $stmt->execute([$admin_email]);
    $count = $stmt->fetchColumn();
    
    if ($count == 0) {
        $stmt = $pdo->prepare("INSERT INTO admin (username, email, password) VALUES (?, ?, ?)");
        $stmt->execute([$admin_username, $admin_email, $hashed_password]);
        echo "✅ Admin user created!\n";
    } else {
        // Update existing admin
        $stmt = $pdo->prepare("UPDATE admin SET password = ?, username = ? WHERE email = ?");
        $stmt->execute([$hashed_password, $admin_username, $admin_email]);
        echo "✅ Admin user updated!\n";
    }
    
    echo "\n=============================================\n";
    echo "ADMIN CREDENTIALS:\n";
    echo "=============================================\n";
    echo "Email:    $admin_email\n";
    echo "Password: $admin_password\n";
    echo "Username: $admin_username\n";
    echo "=============================================\n\n";
    
    // ==============================================
    // 14. ADD FOREIGN KEYS (After data is inserted)
    // ==============================================
    try {
        $pdo->exec("ALTER TABLE `episodes` ADD CONSTRAINT `fk_episodes_anime` FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON DELETE CASCADE");
        echo "✅ Foreign key: episodes → anime\n";
    } catch (PDOException $e) {
        echo "⚠️  Foreign key episodes→anime: " . $e->getMessage() . "\n";
    }
    
    try {
        $pdo->exec("ALTER TABLE `comments` ADD CONSTRAINT `fk_comments_episodes` FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON DELETE CASCADE");
        echo "✅ Foreign key: comments → episodes\n";
    } catch (PDOException $e) {
        echo "⚠️  Foreign key comments→episodes: " . $e->getMessage() . "\n";
    }
    
    try {
        $pdo->exec("ALTER TABLE `episode_likes` ADD CONSTRAINT `fk_likes_episodes` FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON DELETE CASCADE");
        echo "✅ Foreign key: episode_likes → episodes\n";
    } catch (PDOException $e) {
        echo "⚠️  Foreign key likes→episodes: " . $e->getMessage() . "\n";
    }
    
    try {
        $pdo->exec("ALTER TABLE `admin_sessions` ADD CONSTRAINT `fk_sessions_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin`(`id`) ON DELETE CASCADE");
        echo "✅ Foreign key: admin_sessions → admin\n";
    } catch (PDOException $e) {
        echo "⚠️  Foreign key sessions→admin: " . $e->getMessage() . "\n";
    }
    
    try {
        $pdo->exec("ALTER TABLE `admin_login_history` ADD CONSTRAINT `fk_history_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin`(`id`) ON DELETE CASCADE");
        echo "✅ Foreign key: admin_login_history → admin\n";
    } catch (PDOException $e) {
        echo "⚠️  Foreign key history→admin: " . $e->getMessage() . "\n";
    }
    
    // ==============================================
    // 15. RE-ENABLE FOREIGN KEY CHECKS
    // ==============================================
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    echo "\n✅ Foreign key checks re-enabled\n";
    
    // ==============================================
    // 16. FINAL VERIFICATION
    // ==============================================
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "\n=============================================\n";
    echo "TABLES INSTALLED (" . count($tables) . " tables):\n";
    echo "=============================================\n";
    foreach ($tables as $table) {
        echo "  📁 $table\n";
    }
    
    echo "\n=============================================\n";
    echo "✅ INSTALLATION COMPLETE!\n";
    echo "=============================================\n";
    echo "\n🔐 LOGIN DETAILS:\n";
    echo "   URL: http://yourdomain.com/admin/login.php\n";
    echo "   Email: explaineraliwebsite@gmail.com\n";
    echo "   Password: Explainerali555\n";
    echo "\n⚠️  DELETE THIS FILE NOW FOR SECURITY!\n";
    echo "=============================================\n";
    
} catch (PDOException $e) {
    // Re-enable foreign keys on error
    try {
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    } catch (Exception $ex) {}
    
    die("\n❌ ERROR: " . $e->getMessage() . "\n");
}
?>