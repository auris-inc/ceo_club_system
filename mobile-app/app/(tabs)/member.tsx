import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { CircleCategory } from '../../types';

type UserCircle = {
  id: string;
  name: string;
  category: CircleCategory;
  sort_order: number;
};

export default function MemberScreen() {
  const { user, signOut } = useAuthStore();
  const [userCircles, setUserCircles] = useState<UserCircle[]>([]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const fetchUserCircles = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('user_circles')
      .select('circle:circles(id, name, category, sort_order)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching user circles:', error);
      return;
    }

    const list = ((data ?? [])
      .map((row: any) => row.circle)
      .filter(Boolean) as UserCircle[])
      .sort((a, b) => {
        if (a.category !== b.category) return a.category === 'district' ? -1 : 1;
        return a.sort_order - b.sort_order;
      });
    setUserCircles(list);
  }, [user?.id]);

  // 編集画面から戻ったとき最新化されるよう、フォーカス時に再取得
  useFocusEffect(
    useCallback(() => {
      void fetchUserCircles();
    }, [fetchUserCircles]),
  );

  // 会員番号を生成（IDの最初の8文字を使用）
  const memberId = user?.id ? user.id.substring(0, 8).toUpperCase() : '';

  const districtCircles = userCircles.filter((c) => c.category === 'district');
  const clubCircles = userCircles.filter((c) => c.category === 'club');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {user && (
          <>
            {/* 会員証カード */}
            <View style={styles.memberCard}>
              <View style={styles.memberCardHeader}>
                <View style={styles.memberCardLogo}>
                  <Text style={styles.memberCardLogoText}>CEO</Text>
                  <Text style={styles.memberCardLogoSubText}>CLUB</Text>
                </View>
                <View style={styles.memberCardBadge}>
                  <Text style={styles.memberCardBadgeText}>会員証</Text>
                </View>
              </View>
              
              <View style={styles.memberCardBody}>
                <View style={styles.memberCardProfile}>
                  {user.profile_image_url ? (
                    <Image
                      source={{ uri: user.profile_image_url }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons name="person" size={40} color="#243266" />
                    </View>
                  )}
                </View>
                
                <View style={styles.memberCardInfo}>
                  <Text style={styles.memberCardName}>{user.full_name}</Text>
                  {user.company_name && (
                    <Text style={styles.memberCardCompany}>{user.company_name}</Text>
                  )}
                  <View style={styles.memberCardIdContainer}>
                    <Text style={styles.memberCardIdLabel}>会員番号</Text>
                    <Text style={styles.memberCardId}>{memberId}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.memberCardFooter}>
                <View style={styles.memberCardFooterLine} />
                <Text style={styles.memberCardFooterText}>
                  CEO倶楽部 会員証
                </Text>
              </View>
            </View>

            {/* プロフィール情報 */}
            <View style={styles.profileSection}>
              <Text style={styles.label}>氏名</Text>
              <Text style={styles.value}>{user.full_name}</Text>
            </View>
            <View style={styles.profileSection}>
              <Text style={styles.label}>メールアドレス</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>
            {user.company_name && (
              <View style={styles.profileSection}>
                <Text style={styles.label}>会社名</Text>
                <Text style={styles.value}>{user.company_name}</Text>
              </View>
            )}

            {/* 会員タグ表示 */}
            <View style={styles.profileSection}>
              <Text style={styles.label}>地区会</Text>
              {districtCircles.length === 0 ? (
                <Text style={styles.emptyValue}>未設定</Text>
              ) : (
                <View style={styles.chipRow}>
                  {districtCircles.map((c) => (
                    <View key={c.id} style={[styles.chip, styles.chipDistrict]}>
                      <Text style={styles.chipText}>{c.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.profileSection}>
              <Text style={styles.label}>部活動</Text>
              {clubCircles.length === 0 ? (
                <Text style={styles.emptyValue}>未設定</Text>
              ) : (
                <View style={styles.chipRow}>
                  {clubCircles.map((c) => (
                    <View key={c.id} style={[styles.chip, styles.chipClub]}>
                      <Text style={styles.chipText}>{c.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/(tabs)/member/edit')}
            >
              <Text style={styles.editButtonText}>プロフィール編集</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutButtonText}>ログアウト</Text>
            </TouchableOpacity>

            <Text style={styles.versionText}>
              v1.0.0 (2026-05-20 OTA #1)
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  // 会員証カード
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#243266',
  },
  memberCardLogo: {
    alignItems: 'flex-start',
  },
  memberCardLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#243266',
    letterSpacing: 2,
  },
  memberCardLogoSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a8895b',
    letterSpacing: 1,
    marginTop: -4,
  },
  memberCardBadge: {
    backgroundColor: '#243266',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberCardBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  memberCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  memberCardProfile: {
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#243266',
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    borderWidth: 3,
    borderColor: '#243266',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCardInfo: {
    flex: 1,
  },
  memberCardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  memberCardCompany: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  memberCardIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  memberCardIdLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 8,
  },
  memberCardId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#243266',
    letterSpacing: 1,
  },
  memberCardFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  memberCardFooterLine: {
    width: 40,
    height: 2,
    backgroundColor: '#a8895b',
    marginBottom: 8,
  },
  memberCardFooterText: {
    fontSize: 10,
    color: '#999',
    letterSpacing: 1,
  },
  // プロフィール情報
  profileSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  emptyValue: {
    fontSize: 14,
    color: '#999',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipDistrict: {
    backgroundColor: '#dbeafe',
  },
  chipClub: {
    backgroundColor: '#ede9fe',
  },
  chipText: {
    fontSize: 13,
    color: '#243266',
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: '#243266',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  signOutButtonText: {
    color: '#666',
    fontSize: 16,
  },
  versionText: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 11,
    color: '#bbb',
  },
});

