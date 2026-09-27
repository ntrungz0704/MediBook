<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Models\User;
use App\Models\Patient;

class ProfileController extends Controller {
    public function index(): void {
        Auth::requireLogin();

        $userModel = new User();
        $user = $userModel->find(Auth::id());

        $patient = null;
        if (Auth::role() === 'patient') {
            $patient = (new Patient())->getByUserId(Auth::id());
        }

        $this->view('profile/index', [
            'pageTitle' => 'Thông tin cá nhân - MediBook',
            'user' => $user,
            'patient' => $patient
        ]);
    }

    public function update(): void {
        Auth::requireLogin();
        $this->validateCsrf();

        $validator = $this->validate([
            'name' => 'required|min:2',
            'phone' => 'required|min:9'
        ]);

        if ($validator->fails()) {
            $this->redirect('/profile');
            return;
        }

        $userId = Auth::id();
        $userModel = new User();
        $userModel->update($userId, [
            'name' => $this->request->input('name'),
            'phone' => $this->request->input('phone')
        ]);

        // If patient, update patient health profile
        if (Auth::role() === 'patient') {
            $patientModel = new Patient();
            $patient = $patientModel->getByUserId($userId);
            $patientData = [
                'dob' => $this->request->input('dob') ?: null,
                'gender' => $this->request->input('gender', 'other'),
                'blood_group' => $this->request->input('blood_group'),
                'address' => $this->request->input('address'),
                'emergency_contact' => $this->request->input('emergency_contact'),
                'health_insurance_no' => $this->request->input('health_insurance_no'),
                'medical_history' => $this->request->input('medical_history')
            ];

            if ($patient) {
                $patientModel->update($patient['id'], $patientData);
            } else {
                $patientData['user_id'] = $userId;
                $patientModel->create($patientData);
            }
        }

        // Update session user name
        Session::set('user_name', $this->request->input('name'));

        Session::flash('success', 'Cập nhật thông tin hồ sơ thành công!');
        $this->redirect('/profile');
    }

    public function changePassword(): void {
        Auth::requireLogin();
        $this->validateCsrf();

        $validator = $this->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:6|confirmed'
        ]);

        if ($validator->fails()) {
            $this->redirect('/profile');
            return;
        }

        $userModel = new User();
        $user = $userModel->find(Auth::id());

        if (!password_verify($this->request->input('current_password'), $user['password_hash'])) {
            Session::flash('error', 'Mật khẩu hiện tại không chính xác.');
            $this->redirect('/profile');
            return;
        }

        $newHash = password_hash($this->request->input('new_password'), PASSWORD_BCRYPT);
        $userModel->update(Auth::id(), ['password_hash' => $newHash]);

        Session::flash('success', 'Đổi mật khẩu thành công!');
        $this->redirect('/profile');
    }
}
