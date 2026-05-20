import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { router } from 'expo-router';
import type { Circle, CircleCategory } from '../../../types';

const DISTRICT_LIMIT = 2;

export default function EditProfileScreen() {
  const { user, setUser } = useAuthStore();
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    company_name: user?.company_name || '',
  });
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!user) return;
    void loadCirclesAndSelection();
  }, [user?.id]);

  const loadCirclesAndSelection = async () => {
    if (!user) return;
    try {
      setInitializing(true);

      const [{ data: allCircles, error: circlesError }, { data: userCircles, error: ucError }] =
        await Promise.all([
          supabase
            .from('circles')
            .select('id, name, category, sort_order, is_active, created_at')
            .eq('is_active', true)
            .order('category')
            .order('sort_order'),
          supabase.from('user_circles').select('circle_id').eq('user_id', user.id),
        ]);

      if (circlesError) throw circlesError;
      if (ucError) throw ucError;

      setCircles((allCircles ?? []) as Circle[]);
      setSelectedCircleIds((userCircles ?? []).map((uc: { circle_id: string }) => uc.circle_id));
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'タグの取得に失敗しました');
    } finally {
      setInitializing(false);
    }
  };

  const districtCircles = circles.filter((c) => c.category === 'district');
  const clubCircles = circles.filter((c) => c.category === 'club');
  const selectedDistrictCount = selectedCircleIds.filter((id) =>
    districtCircles.some((c) => c.id === id),
  ).length;

  const toggleCircle = (circle: Circle) => {
    const checked = selectedCircleIds.includes(circle.id);
    if (checked) {
      setSelectedCircleIds(selectedCircleIds.filter((id) => id !== circle.id));
      return;
    }
    if (circle.category === 'district' && selectedDistrictCount >= DISTRICT_LIMIT) {
      Alert.alert('選択上限', `地区会は最大${DISTRICT_LIMIT}つまで選択できます`);
      return;
    }
    setSelectedCircleIds([...selectedCircleIds, circle.id]);
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          company_name: formData.company_name,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // タグを入れ直し（差分更新ではなく全置換）
      const { error: deleteError } = await supabase
        .from('user_circles')
        .delete()
        .eq('user_id', user.id);
      if (deleteError) throw deleteError;

      if (selectedCircleIds.length > 0) {
        const inserts = selectedCircleIds.map((circleId) => ({
          user_id: user.id,
          circle_id: circleId,
        }));
        const { error: insertError } = await supabase.from('user_circles').insert(inserts);
        if (insertError) throw insertError;
      }

      setUser(data);
      Alert.alert('完了', 'プロフィールを更新しました', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('エラー', error.message || '更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const renderCircleRow = (circle: Circle) => {
    const checked = selectedCircleIds.includes(circle.id);
    const disabled =
      !checked &&
      circle.category === 'district' &&
      selectedDistrictCount >= DISTRICT_LIMIT;
    return (
      <TouchableOpacity
        key={circle.id}
        style={[styles.circleRow, disabled && styles.circleRowDisabled]}
        onPress={() => !disabled && toggleCircle(circle)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
        <Text style={[styles.circleName, disabled && styles.circleNameDisabled]}>
          {circle.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>氏名</Text>
            <TextInput
              style={styles.input}
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
              placeholder="氏名を入力"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>会社名</Text>
            <TextInput
              style={styles.input}
              value={formData.company_name}
              onChangeText={(text) => setFormData({ ...formData, company_name: text })}
              placeholder="会社名を入力"
            />
          </View>

          {/* 地区会セクション */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionTitle}>地区会</Text>
            <Text style={styles.sectionHint}>
              オフィスやご自宅のご住所などゆかりのある地域2つまでお選びできます
            </Text>
            {initializing ? (
              <ActivityIndicator size="small" color="#243266" />
            ) : districtCircles.length === 0 ? (
              <Text style={styles.emptyText}>地区会タグはまだ登録されていません</Text>
            ) : (
              <View style={styles.circleList}>{districtCircles.map(renderCircleRow)}</View>
            )}
          </View>

          {/* 部活動セクション */}
          <View style={styles.sectionGroup}>
            <Text style={styles.sectionTitle}>部活動</Text>
            {initializing ? (
              <ActivityIndicator size="small" color="#243266" />
            ) : clubCircles.length === 0 ? (
              <Text style={styles.emptyText}>部活動タグはまだ登録されていません</Text>
            ) : (
              <View style={styles.circleList}>{clubCircles.map(renderCircleRow)}</View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading || initializing}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>保存</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionGroup: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#243266',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    paddingVertical: 8,
  },
  circleList: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  circleRowDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#243266',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#243266',
  },
  circleName: {
    fontSize: 16,
    color: '#333',
  },
  circleNameDisabled: {
    color: '#999',
  },
  button: {
    backgroundColor: '#243266',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
