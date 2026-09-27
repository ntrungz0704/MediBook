<?php
namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Core\Response;
use App\Models\User;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\Receptionist;

class UserController extends Controller {
    public function index(): void {
        Auth::requireRole('admin');

        $role = $this->request->input('role', '');
        $keyword = $this->request->input('keyword', '');

        $userModel = new User();
        $users = $userModel->getAllUsersWithDetails($role, $keyword);

        $this->view('admin/users/index', [
            'pageTitle' => 'Quản lý người dùng - Admin',
            'users' => $users,
            'role' => $role,
            'keyword' => $keyword
        ], 'layouts/admin');
    }

    public function create(): void {
        Auth::requireRole('admin');
        $this->view('admin/users/form', [
            'pageTitle' => 'Thêm người dùng mới',
            'user' => null
        ], 'layouts/admin');
    }

    public function store(): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $validator = $this->validate([
            'name' => 'required|min:2',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role' => 'required|in:admin,receptionist,doctor,patient',
            'phone' => 'required'
        ]);

        if ($validator->fails()) {
            $this->redirect('/admin/users/create');
            return;
        }

        $userModel = new User();
        $role = $this->request->input('role');
        $userId = $userModel->create([
            'name' => $this->request->input('name'),
            'email' => strtolower($this->request->input('email')),
            'password_hash' => password_hash($this->request->input('password'), PASSWORD_BCRYPT),
            'phone' => $this->request->input('phone'),
            'role' => $role,
            'status' => $this->request->input('status', 'active')
        ]);

        // Auto-create role specific table profile
        if ($role === 'patient') {
            (new Patient())->create(['user_id' => $userId]);
        } elseif ($role === 'doctor') {
            (new Doctor())->create([
                'user_id' => $userId,
                'title' => 'Bác sĩ',
                'room_number' => 'P.' . (100 + $userId)
            ]);
        } elseif ($role === 'receptionist') {
            (new Receptionist())->create([
                'user_id' => $userId,
                'staff_code' => 'LT-' . sprintf('%03d', $userId)
            ]);
        }

        $this->logActivity('ADMIN_CREATE_USER', 'User', (int)$userId, "Tạo tài khoản {$role}: " . $this->request->input('email'));
        Session::flash('success', 'Thêm tài khoản người dùng thành công!');
        $this->redirect('/admin/users');
    }

    public function edit(int $id): void {
        Auth::requireRole('admin');

        $userModel = new User();
        $user = $userModel->find($id);

        if (!$user) {
            Response::error(404, 'Không tìm thấy người dùng.');
            return;
        }

        $this->view('admin/users/form', [
            'pageTitle' => 'Chỉnh sửa người dùng: ' . $user['name'],
            'user' => $user
        ], 'layouts/admin');
    }

    public function update(int $id): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $userModel = new User();
        $user = $userModel->find($id);
        if (!$user) {
            Response::error(404);
            return;
        }

        $validator = $this->validate([
            'name' => 'required|min:2',
            'email' => "required|email|unique:users,email,{$id}",
            'phone' => 'required',
            'role' => 'required|in:admin,receptionist,doctor,patient'
        ]);

        if ($validator->fails()) {
            $this->redirect('/admin/users/edit/' . $id);
            return;
        }

        $updateData = [
            'name' => $this->request->input('name'),
            'email' => strtolower($this->request->input('email')),
            'phone' => $this->request->input('phone'),
            'role' => $this->request->input('role'),
            'status' => $this->request->input('status', 'active')
        ];

        $newPassword = $this->request->input('password');
        if (!empty($newPassword)) {
            $updateData['password_hash'] = password_hash($newPassword, PASSWORD_BCRYPT);
        }

        $userModel->update($id, $updateData);

        $this->logActivity('ADMIN_UPDATE_USER', 'User', $id, "Cập nhật tài khoản ID {$id}");
        Session::flash('success', 'Cập nhật tài khoản thành công!');
        $this->redirect('/admin/users');
    }

    public function toggleStatus(int $id): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $userModel = new User();
        $user = $userModel->find($id);
        if ($user) {
            $newStatus = $user['status'] === 'active' ? 'inactive' : 'active';
            $userModel->update($id, ['status' => $newStatus]);
            Session::flash('success', "Đã chuyển trạng thái tài khoản thành {$newStatus}.");
        }

        $this->redirect('/admin/users');
    }
}
